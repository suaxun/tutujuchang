import { extension_settings, getContext } from "../../../extensions.js";
import { generateQuietPrompt } from "../../../script.js";

const extensionName = "tutujuchang";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

console.log("【兔兔小剧场】1. 扩展模块已成功导入！");

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
    console.log("【兔兔小剧场】2. jQuery已就绪，开始加载设置...");
    await loadSettings();

    try {
        console.log("【兔兔小剧场】3. 正在请求 HTML 文件...");
        const timestamp = Date.now();
        const htmlData = await $.get(`${extensionFolderPath}/index.html?v=${timestamp}`);
        
        console.log("【兔兔小剧场】4. HTML获取成功，正在解析并注入 DOM...");
        const $tempDiv = $('<div>').html(htmlData);
        const $extensionUI = $tempDiv.find('#mini-theater-extension-ui');
        const $popupUI = $tempDiv.find('#mini-theater-popup');

        if ($extensionUI.length === 0 || $popupUI.length === 0) {
            console.error("【兔兔小剧场】错误：未能在 index.html 中找到对应的 UI 元素，请检查 HTML 文件内容！");
            return;
        }

        // 注入 CSS 和 悬浮窗
        $("head").append(`<link rel="stylesheet" href="${extensionFolderPath}/style.css?v=${timestamp}">`);
        $("body").append($popupUI);

        // 注入到扩展列表
        const $wrapper = $('<div class="extension_container"></div>').append($extensionUI);
        $('#extensions_settings').append($wrapper);

        // 注入到聊天框旁边
        const chatQuickBtn = `
            <div id="mt-chat-quick-btn" class="fa-solid fa-clapperboard interactable" title="🎬 呼出小剧场生成器" tabindex="0" style="margin-left: 5px; opacity: 0.6; transition: opacity 0.2s;"></div>
        `;
        $('#leftSendForm').append(chatQuickBtn);

        console.log("【兔兔小剧场】5. UI 注入完成，开始绑定事件...");

        // 绑定事件
        $('#mt-chat-quick-btn').hover(
            function() { $(this).css('opacity', '1'); },
            function() { $(this).css('opacity', '0.6'); }
        );

        $('#mt-chat-quick-btn').on('click', () => {
            $('#mini-theater-popup').fadeIn(200);
        });

        $extensionUI.find('.inline-drawer-toggle').on('click', function () {
            const icon = $(this).find('.inline-drawer-icon');
            icon.toggleClass('down up');
            $(this).next('.inline-drawer-content').slideToggle(200);
        });

        $('#mini-theater-popup').draggable({ handle: '#mini-theater-header' });

        $('#mt-open-popup-btn').on('click', () => {
            $('#mini-theater-popup').fadeIn(200);
        });

        $('#mini-theater-close').on('click', () => {
            $('#mini-theater-popup').fadeOut(200);
        });

        // 填充设置
        const settings = extension_settings[extensionName];
        $('#mt-use-context').prop('checked', settings.useContext);
        $('#mt-use-custom-api').prop('checked', settings.useCustomApi);
        $('#mt-api-url').val(settings.apiUrl);
        $('#mt-api-key').val(settings.apiKey);
        $('#mt-api-model').val(settings.apiModel);
        $('#mt-prompt-extra').val(settings.promptExtra);
        
        if (settings.useCustomApi) {
            $('#mt-custom-api-settings').css('display', 'flex');
        }

        $('#mt-use-custom-api').on('change', function () {
            if ($(this).is(':checked')) {
                $('#mt-custom-api-settings').slideDown(200);
            } else {
                $('#mt-custom-api-settings').slideUp(200);
            }
        });

        // 生成逻辑
        $('#mt-generate-btn').on('click', async () => {
            const btn = $('#mt-generate-btn');
            btn.text('⏳ 正在生成中，请稍候...');
            btn.css('pointer-events', 'none');
            $('#mini-theater-result').val('生成中...');

            extension_settings[extensionName] = {
                useContext: $('#mt-use-context').is(':checked'),
                useCustomApi: $('#mt-use-custom-api').is(':checked'),
                apiUrl: $('#mt-api-url').val(),
                apiKey: $('#mt-api-key').val(),
                apiModel: $('#mt-api-model').val(),
                promptExtra: $('#mt-prompt-extra').val()
            };

            const currentSet = extension_settings[extensionName];
            const stContext = getContext();
            const chat = stContext.chat;
            const name1 = stContext.name1;
            const name2 = stContext.name2;

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

        console.log("【兔兔小剧场】6. 扩展完全加载成功！");

    } catch (e) {
        console.error("【兔兔小剧场】加载过程中出现严重错误：", e);
    }
});
