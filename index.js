import { extension_settings } from "../../../extensions.js";
import { generateQuietPrompt, chat, name1, name2 } from "../../../script.js";

const extensionName = "mini-theater-generator";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

const defaultSettings = {
    useContext: true,
    useCustomApi: false,
    apiUrl: "",
    apiKey: "",
    apiModel: "",
    promptExtra: "请根据以上上下文，生成一段有趣的平行宇宙小剧场："
};

let currentTargetMesId = -1; // 记录是从哪条消息触发的

async function loadSettings() {
    if (!extension_settings[extensionName]) {
        extension_settings[extensionName] = defaultSettings;
    }
}

jQuery(async () => {
    await loadSettings();

    // 1. 加载悬浮窗 HTML 和 CSS
    const html = await $.get(`${extensionFolderPath}/index.html`);
    $("body").append(html);
    $("head").append(`<link rel="stylesheet" href="${extensionFolderPath}/style.css">`);

    // 绑定悬浮窗拖拽
    $('#mini-theater-popup').draggable({ handle: '#mini-theater-header' });

    // 初始化 UI
    const settings = extension_settings[extensionName];
    $('#mt-use-context').prop('checked', settings.useContext);
    $('#mt-use-custom-api').prop('checked', settings.useCustomApi);
    $('#mt-api-url').val(settings.apiUrl);
    $('#mt-api-key').val(settings.apiKey);
    $('#mt-api-model').val(settings.apiModel);
    $('#mt-prompt-extra').val(settings.promptExtra);
    if (settings.useCustomApi) $('#mt-custom-api-settings').css('display', 'flex');

    // ==========================================
    // 核心 UI 注入逻辑：放到右下角和消息菜单里
    // ==========================================

    // 注入 A: 聊天框右下角 (发送按钮旁边)
    // 这里兼容了可能存在的 extensionsMenuButton 或者默认的 rightSendForm
    const chatBarBtn = `<div id="mt_chat_bar_btn" class="fa-solid fa-clapperboard interactable" title="小剧场生成器" style="margin: 0 8px; font-size: 0.9em;"></div>`;
    if ($('#extensionsMenuButton').length) {
        $('#extensionsMenuButton').before(chatBarBtn);
    } else {
        $('#rightSendForm').prepend(chatBarBtn); // 放到发送按钮组的最前面
    }

    // 注入 B: 每条消息的扩展菜单 (和"生成图片"放在一起)
    const msgTheaterBtn = `<div title="以此为节点生成小剧场" class="mes_button mt_message_gen fa-solid fa-clapperboard"></div>`;
    // 1. 注入到 HTML 模板中，这样以后新发的消息自动带有这个按钮
    $('#message_template .extraMesButtons').append(msgTheaterBtn);
    // 2. 注入到当前页面已经存在的老消息中
    $('.extraMesButtons').not(':has(.mt_message_gen)').append(msgTheaterBtn);

    // ==========================================
    // 绑定点击事件
    // ==========================================

    // 点击右下角按钮：获取全局最新上下文
    $('#mt_chat_bar_btn').on('click', () => {
        currentTargetMesId = chat.length - 1; 
        $('#mini-theater-popup').fadeToggle(200);
    });

    // 点击某条消息的按钮：获取到该消息为止的上下文
    $(document).on('click', '.mt_message_gen', function() {
        // 获取这条消息的 ID
        currentTargetMesId = parseInt($(this).closest('.mes').attr('mesid'));
        $('#mini-theater-popup').fadeIn(200);
    });

    // 关闭悬浮窗
    $('#mini-theater-close').on('click', () => {
        $('#mini-theater-popup').fadeOut(200);
    });

    // 切换 API 选项
    $('#mt-use-custom-api').on('change', function () {
        if ($(this).is(':checked')) {
            $('#mt-custom-api-settings').slideDown(200);
        } else {
            $('#mt-custom-api-settings').slideUp(200);
        }
    });

    // ==========================================
    // 生成逻辑
    // ==========================================
    $('#mt-generate-btn').on('click', async () => {
        const btn = $('#mt-generate-btn');
        btn.text('⏳ 正在生成中，请稍候...');
        btn.css('pointer-events', 'none');
        $('#mini-theater-result').val('生成中...');

        // 保存设置
        extension_settings[extensionName] = {
            useContext: $('#mt-use-context').is(':checked'),
            useCustomApi: $('#mt-use-custom-api').is(':checked'),
            apiUrl: $('#mt-api-url').val(),
            apiKey: $('#mt-api-key').val(),
            apiModel: $('#mt-api-model').val(),
            promptExtra: $('#mt-prompt-extra').val()
        };

        const currentSet = extension_settings[extensionName];

        // 提取聊天记录 (最多向前提取 15 条，防止超 Token)
        let finalPrompt = "";
        if (currentSet.useContext) {
            let contextLog = "";
            const historyCount = 15;
            const startIndex = Math.max(0, currentTargetMesId - historyCount + 1);
            const endIndex = currentTargetMesId >= 0 ? currentTargetMesId : (chat.length - 1);
            
            for (let i = startIndex; i <= endIndex; i++) {
                if (chat[i] && !chat[i].is_system) {
                    let speaker = chat[i].is_user ? name1 : chat[i].name;
                    contextLog += `${speaker}: ${chat[i].mes}\n`;
                }
            }
            if (contextLog.trim() !== "") {
                finalPrompt += `以下是 ${name1} 和 ${name2} 的聊天记录片段：\n${contextLog}\n\n`;
            }
        }
        
        finalPrompt += currentSet.promptExtra;

        try {
            let resultText = "";

            if (currentSet.useCustomApi) {
                if(!currentSet.apiUrl || !currentSet.apiKey) throw new Error("请填写 API URL 和 Key");
                const response = await fetch(currentSet.apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentSet.apiKey}` },
                    body: JSON.stringify({
                        model: currentSet.apiModel || "gpt-3.5-turbo",
                        messages: [{ role: "user", content: finalPrompt }],
                        temperature: 0.8
                    })
                });

                if (!response.ok) throw new Error(`API 错误: ${response.status}`);
                const data = await response.json();
                resultText = data.choices[0].message.content;
            } else {
                // 调用酒馆的静默生成 API
                resultText = await generateQuietPrompt(finalPrompt);
            }

            $('#mini-theater-result').val(resultText);

        } catch (error) {
            console.error(error);
            $('#mini-theater-result').val(`生成失败：${error.message}`);
        } finally {
            btn.text('✨ 开始生成小剧场 ✨');
            btn.css('pointer-events', 'auto');
        }
    });

    // 复制和发送到输入框
    $('#mt-copy-btn').on('click', async () => {
        const text = $('#mini-theater-result').val();
        if(text) {
            await navigator.clipboard.writeText(text);
            toastr.success("已复制到剪贴板！"); 
        }
    });

    $('#mt-send-btn').on('click', () => {
        const text = $('#mini-theater-result').val();
        if(text) {
            $('#send_textarea').val(`【小剧场】\n${text}`);
            $('#send_textarea').trigger('input'); 
            toastr.success("已填入聊天框！");
        }
    });
});
