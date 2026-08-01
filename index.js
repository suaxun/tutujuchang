import { extension_settings } from "../../../extensions.js";
import { generateQuietPrompt, chat, name1, name2 } from "../../../script.js";

const extensionName = "tutujuchang";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

const defaultSettings = {
    useContext: true,
    useCustomApi: false,
    apiUrl: "",
    apiKey: "",
    apiModel: "",
    promptExtra: "请根据以上的聊天上下文，生成一段有趣的平行宇宙小剧场："
};

async function loadSettings() {
    if (!extension_settings[extensionName]) {
        extension_settings[extensionName] = defaultSettings;
    }
}

jQuery(async () => {
    await loadSettings();

    // 1. 请求 HTML 文件
    const htmlData = await $.get(`${extensionFolderPath}/index.html`);
    const $parsedHtml = $(htmlData);
    
    // 2. 分离出两块 UI
    const $extensionUI = $parsedHtml.filter('#mini-theater-extension-ui');
    const $popupUI = $parsedHtml.filter('#mini-theater-popup');

    // 3. 注入 CSS 和 悬浮窗到 body
    $("head").append(`<link rel="stylesheet" href="${extensionFolderPath}/style.css">`);
    $("body").append($popupUI);

    // 4. 将控制面板注入到酒馆的“扩展(Extensions)”列表中
    // 根据你的源码，酒馆的扩展放于 #extensions_settings 和 #extensions_settings2
    $('#extensions_settings').append($extensionUI);

    // ==========================================
    // 绑定基础事件
    // ==========================================

    // 绑定扩展面板的手风琴折叠展开效果 (兼容酒馆的原生效果)
    $extensionUI.find('.inline-drawer-toggle').on('click', function () {
        const icon = $(this).find('.inline-drawer-icon');
        icon.toggleClass('down up');
        $(this).next('.inline-drawer-content').slideToggle(200);
    });

    // 绑定拖拽
    $('#mini-theater-popup').draggable({ handle: '#mini-theater-header' });

    // 点击扩展面板里的按钮，打开悬浮窗
    $('#mt-open-popup-btn').on('click', () => {
        $('#mini-theater-popup').fadeIn(200);
    });

    // 悬浮窗关闭按钮
    $('#mini-theater-close').on('click', () => {
        $('#mini-theater-popup').fadeOut(200);
    });

    // 初始化数据填充
    const settings = extension_settings[extensionName];
    $('#mt-use-context').prop('checked', settings.useContext);
    $('#mt-use-custom-api').prop('checked', settings.useCustomApi);
    $('#mt-api-url').val(settings.apiUrl);
    $('#mt-api-key').val(settings.apiKey);
    $('#mt-api-model').val(settings.apiModel);
    $('#mt-prompt-extra').val(settings.promptExtra);
    if (settings.useCustomApi) $('#mt-custom-api-settings').css('display', 'flex');

    // 自定义API开关
    $('#mt-use-custom-api').on('change', function () {
        if ($(this).is(':checked')) {
            $('#mt-custom-api-settings').slideDown(200);
        } else {
            $('#mt-custom-api-settings').slideUp(200);
        }
    });

    // ==========================================
    // 核心：生成逻辑
    // ==========================================
    $('#mt-generate-btn').on('click', async () => {
        const btn = $('#mt-generate-btn');
        btn.text('⏳ 正在生成中，请稍候...');
        btn.css('pointer-events', 'none');
        $('#mini-theater-result').val('生成中...');

        // 存设置
        extension_settings[extensionName] = {
            useContext: $('#mt-use-context').is(':checked'),
            useCustomApi: $('#mt-use-custom-api').is(':checked'),
            apiUrl: $('#mt-api-url').val(),
            apiKey: $('#mt-api-key').val(),
            apiModel: $('#mt-api-model').val(),
            promptExtra: $('#mt-prompt-extra').val()
        };

        const currentSet = extension_settings[extensionName];

        // 提取聊天记录 (提取最后15条)
        let finalPrompt = "";
        if (currentSet.useContext) {
            let contextLog = "";
            const historyCount = 15;
            const startIndex = Math.max(0, chat.length - historyCount);
            
            for (let i = startIndex; i < chat.length; i++) {
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

    // 复制和发送
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
