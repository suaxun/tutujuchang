import { extension_settings } from "../../../extensions.js";
import { generateQuietPrompt } from "../../../script.js";
import { getChatText, name1, name2 } from "../../../script.js"; // 获取上下文和名字

const extensionName = "mini-theater-generator";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

// 默认设置
const defaultSettings = {
    useContext: true,
    useCustomApi: false,
    apiUrl: "",
    apiKey: "",
    apiModel: "",
    promptExtra: "请根据上下文，生成一段有趣的平行宇宙小剧场："
};

// 初始化设置
async function loadSettings() {
    if (!extension_settings[extensionName]) {
        extension_settings[extensionName] = defaultSettings;
    }
}

// 主初始化函数
jQuery(async () => {
    await loadSettings();

    // 加载 HTML 和 CSS
    const html = await $.get(`${extensionFolderPath}/index.html`);
    $("body").append(html);
    $("head").append(`<link rel="stylesheet" href="${extensionFolderPath}/style.css">`);

    // 绑定拖拽 (使用 jQuery UI，酒馆自带)
    $('#mini-theater-popup').draggable({ handle: '#mini-theater-header' });

    // 初始化 UI 数据
    const settings = extension_settings[extensionName];
    $('#mt-use-context').prop('checked', settings.useContext);
    $('#mt-use-custom-api').prop('checked', settings.useCustomApi);
    $('#mt-api-url').val(settings.apiUrl);
    $('#mt-api-key').val(settings.apiKey);
    $('#mt-api-model').val(settings.apiModel);
    $('#mt-prompt-extra').val(settings.promptExtra);

    if (settings.useCustomApi) $('#mt-custom-api-settings').css('display', 'flex');

    // 注入按钮到右下角选项菜单 (Options menu - wand icon)
    const theaterMenuBtn = `
        <a id="option_toggle_mini_theater">
            <i class="fa-lg fa-solid fa-clapperboard"></i>
            <span>小剧场生成器</span>
        </a>
    `;
    $('.options-content').append(theaterMenuBtn);

    // 绑定事件
    $('#option_toggle_mini_theater').on('click', () => {
        $('#mini-theater-popup').toggle();
        $('#options').hide(); // 点击后关闭酒馆的选项菜单
    });

    $('#mini-theater-close').on('click', () => {
        $('#mini-theater-popup').hide();
    });

    $('#mt-use-custom-api').on('change', function () {
        if ($(this).is(':checked')) {
            $('#mt-custom-api-settings').css('display', 'flex');
        } else {
            $('#mt-custom-api-settings').hide();
        }
    });

    // 核心：生成逻辑
    $('#mt-generate-btn').on('click', async () => {
        const btn = $('#mt-generate-btn');
        btn.text('⏳ 正在生成中，请稍候...');
        btn.css('pointer-events', 'none');
        $('#mini-theater-result').val('生成中...');

        // 保存当前设置
        extension_settings[extensionName] = {
            useContext: $('#mt-use-context').is(':checked'),
            useCustomApi: $('#mt-use-custom-api').is(':checked'),
            apiUrl: $('#mt-api-url').val(),
            apiKey: $('#mt-api-key').val(),
            apiModel: $('#mt-api-model').val(),
            promptExtra: $('#mt-prompt-extra').val()
        };

        const settings = extension_settings[extensionName];

        // 构建 Prompt
        let finalPrompt = "";
        if (settings.useContext) {
            // 获取最近10条聊天记录作为上下文
            const chatLog = getChatText(10); 
            finalPrompt += `以下是 ${name1} 和 ${name2} 最近的聊天记录：\n${chatLog}\n\n`;
        }
        finalPrompt += settings.promptExtra;

        try {
            let resultText = "";

            if (settings.useCustomApi) {
                // 自定义 API 调用 (标准 OpenAI 格式)
                if(!settings.apiUrl || !settings.apiKey) throw new Error("请填写 API URL 和 Key");
                
                const response = await fetch(settings.apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${settings.apiKey}`
                    },
                    body: JSON.stringify({
                        model: settings.apiModel || "gpt-3.5-turbo",
                        messages: [{ role: "user", content: finalPrompt }],
                        temperature: 0.8
                    })
                });

                if (!response.ok) throw new Error(`API Error: ${response.status}`);
                const data = await response.json();
                resultText = data.choices[0].message.content;

            } else {
                // 使用酒馆当前的 API (静默生成，不干扰聊天框)
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

    // 复制结果
    $('#mt-copy-btn').on('click', async () => {
        const text = $('#mini-theater-result').val();
        if(text) {
            await navigator.clipboard.writeText(text);
            toastr.success("已复制到剪贴板！"); // 使用酒馆自带的 toastr 提示
        }
    });

    // 发送到聊天框
    $('#mt-send-btn').on('click', () => {
        const text = $('#mini-theater-result').val();
        if(text) {
            // 将文本填入聊天输入框，如果你想直接发出去，可以调用酒馆的 send()，这里为了安全仅填入输入框
            $('#send_textarea').val(`【小剧场】\n${text}`);
            $('#send_textarea').trigger('input'); // 触发自适应高度
            toastr.success("已填入聊天框！");
        }
    });
});
import { extension_settings } from "../../../extensions.js";
import { generateQuietPrompt } from "../../../script.js";
import { getChatText, name1, name2 } from "../../../script.js"; // 获取上下文和名字

const extensionName = "mini-theater-generator";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

// 默认设置
const defaultSettings = {
    useContext: true,
    useCustomApi: false,
    apiUrl: "",
    apiKey: "",
    apiModel: "",
    promptExtra: "请根据上下文，生成一段有趣的平行宇宙小剧场："
};

// 初始化设置
async function loadSettings() {
    if (!extension_settings[extensionName]) {
        extension_settings[extensionName] = defaultSettings;
    }
}

// 主初始化函数
jQuery(async () => {
    await loadSettings();

    // 加载 HTML 和 CSS
    const html = await $.get(`${extensionFolderPath}/index.html`);
    $("body").append(html);
    $("head").append(`<link rel="stylesheet" href="${extensionFolderPath}/style.css">`);

    // 绑定拖拽 (使用 jQuery UI，酒馆自带)
    $('#mini-theater-popup').draggable({ handle: '#mini-theater-header' });

    // 初始化 UI 数据
    const settings = extension_settings[extensionName];
    $('#mt-use-context').prop('checked', settings.useContext);
    $('#mt-use-custom-api').prop('checked', settings.useCustomApi);
    $('#mt-api-url').val(settings.apiUrl);
    $('#mt-api-key').val(settings.apiKey);
    $('#mt-api-model').val(settings.apiModel);
    $('#mt-prompt-extra').val(settings.promptExtra);

    if (settings.useCustomApi) $('#mt-custom-api-settings').css('display', 'flex');

    // 注入按钮到右下角选项菜单 (Options menu - wand icon)
    const theaterMenuBtn = `
        <a id="option_toggle_mini_theater">
            <i class="fa-lg fa-solid fa-clapperboard"></i>
            <span>小剧场生成器</span>
        </a>
    `;
    $('.options-content').append(theaterMenuBtn);

    // 绑定事件
    $('#option_toggle_mini_theater').on('click', () => {
        $('#mini-theater-popup').toggle();
        $('#options').hide(); // 点击后关闭酒馆的选项菜单
    });

    $('#mini-theater-close').on('click', () => {
        $('#mini-theater-popup').hide();
    });

    $('#mt-use-custom-api').on('change', function () {
        if ($(this).is(':checked')) {
            $('#mt-custom-api-settings').css('display', 'flex');
        } else {
            $('#mt-custom-api-settings').hide();
        }
    });

    // 核心：生成逻辑
    $('#mt-generate-btn').on('click', async () => {
        const btn = $('#mt-generate-btn');
        btn.text('⏳ 正在生成中，请稍候...');
        btn.css('pointer-events', 'none');
        $('#mini-theater-result').val('生成中...');

        // 保存当前设置
        extension_settings[extensionName] = {
            useContext: $('#mt-use-context').is(':checked'),
            useCustomApi: $('#mt-use-custom-api').is(':checked'),
            apiUrl: $('#mt-api-url').val(),
            apiKey: $('#mt-api-key').val(),
            apiModel: $('#mt-api-model').val(),
            promptExtra: $('#mt-prompt-extra').val()
        };

        const settings = extension_settings[extensionName];

        // 构建 Prompt
        let finalPrompt = "";
        if (settings.useContext) {
            // 获取最近10条聊天记录作为上下文
            const chatLog = getChatText(10); 
            finalPrompt += `以下是 ${name1} 和 ${name2} 最近的聊天记录：\n${chatLog}\n\n`;
        }
        finalPrompt += settings.promptExtra;

        try {
            let resultText = "";

            if (settings.useCustomApi) {
                // 自定义 API 调用 (标准 OpenAI 格式)
                if(!settings.apiUrl || !settings.apiKey) throw new Error("请填写 API URL 和 Key");
                
                const response = await fetch(settings.apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${settings.apiKey}`
                    },
                    body: JSON.stringify({
                        model: settings.apiModel || "gpt-3.5-turbo",
                        messages: [{ role: "user", content: finalPrompt }],
                        temperature: 0.8
                    })
                });

                if (!response.ok) throw new Error(`API Error: ${response.status}`);
                const data = await response.json();
                resultText = data.choices[0].message.content;

            } else {
                // 使用酒馆当前的 API (静默生成，不干扰聊天框)
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

    // 复制结果
    $('#mt-copy-btn').on('click', async () => {
        const text = $('#mini-theater-result').val();
        if(text) {
            await navigator.clipboard.writeText(text);
            toastr.success("已复制到剪贴板！"); // 使用酒馆自带的 toastr 提示
        }
    });

    // 发送到聊天框
    $('#mt-send-btn').on('click', () => {
        const text = $('#mini-theater-result').val();
        if(text) {
            // 将文本填入聊天输入框，如果你想直接发出去，可以调用酒馆的 send()，这里为了安全仅填入输入框
            $('#send_textarea').val(`【小剧场】\n${text}`);
            $('#send_textarea').trigger('input'); // 触发自适应高度
            toastr.success("已填入聊天框！");
        }
    });
});
