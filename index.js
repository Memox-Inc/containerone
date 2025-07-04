// Global variable to store repName
const loginPropertyId = "5d1d468822d70e36c2a408f8";
const secretKey = 'af96821caac1f551f21182d47b3746d4cf4f7176';

function hashInBase64(userId) {
    var hash = CryptoJS.HmacSHA256(userId, secretKey);
    return CryptoJS.enc.Hex.stringify(hash);
}

const sendRequest = async (tawkUrl) => {
    try {
        const TOKEN = "G7Lj8R2bF5oAK1O7VldLBUo0xaC9ah4t";
        const url = `https://browserless.memox.io/function?token=${TOKEN}`;

        // The function code must be properly formatted as a string
        const functionCode = `
export default async function ({ page }) {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    await page.goto('https://tawk.to/${tawkUrl}', {
        waitUntil: 'networkidle2',
        timeout: 30000,
    });

    await Promise.race([
        page.waitForSelector('script[src*="embed.tawk.to"]', { timeout: 10000 }),
        page.waitForSelector('#report-property-id', { timeout: 10000 })
    ]).catch(() => {});

    const result = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script[src*="embed.tawk.to"]'));
        const repName = document.title.split(" ").slice(2).join(" ");
        const output = [];

        scripts.forEach(script => {
            try {
                const src = script.src;
                const match = src.match(/https?:\\/\\/embed\\.tawk\\.to\\/([a-f0-9]{24})\\/([^\\/]+)/i);
                if (match) {
                    output.push({
                        propertyId: match[1],
                        widgetId: match[2],
                        scriptSrc: src,
                        repName: repName,
                        timestamp: new Date().toISOString()
                    });
                }
            } catch (e) {}
        });

        return output.length > 0 ? output : { error: "No Tawk.to scripts found" };
    });

    return {
        status: "success",
        data: result,
        metadata: {
            url: page.url(),
            scrapedAt: new Date().toISOString()
        }
    };
}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/javascript'
            },
            body: functionCode
        });

        const rawResponse = await response.json();
        return rawResponse.data[0]

    } catch (error) {
        console.error("Request failed:", error);
        throw error;
    }
};

let currentRepName = '';

(async function () {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const name = urlParams.get("name");
        const email = urlParams.get("email");
        const phone = urlParams.get("phone");
        const userId = urlParams.get("userId");
        const tawkUrl = urlParams.get("url")


        // Fetch Tawk.to IDs from your backend
        const result = await sendRequest(tawkUrl)

        const { propertyId, widgetId, repName } = result;
        currentRepName = repName; // Store the repName globally

        // Update agent display in header immediately
        updateAgentDisplay(repName);

        // Get visitor attributes from URL

        // Validate required parameters
        if (!propertyId || !name || !email || !phone || !userId) {
            showError("Missing required parameters");
            return;
        }

        await new Promise((resolve) => {
            loadTawkScript(propertyId, widgetId, function () {
                window.Tawk_API.setAttributes({
                    hash: hashInBase64(userId),
                    userId: userId,
                    name: name,
                    email: email,
                    phone: phone
                })
                resolve();
            });
        });

        // await tawkLogin({
        //     userId,
        //     name,
        //     email,
        //     phone,
        //     propertyId,
        //     widgetId
        // });


    } catch (error) {
        console.error('Failed during initialization:', error);
        showError("Connection error. Please try again later.");
    }
})();



function updateAgentDisplay(repName) {
    const agentDisplay = document.getElementById('agentHeaderDisplay');
    agentDisplay.innerHTML = `
                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(repName)}&background=3498db&color=fff&size=128" 
                     alt="${repName}" class="agent-avatar">
                <div class="agent-name">${repName}</div>
            `;
}

function showError(message) {
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('chatStatus').innerHTML = `
                <h3>Error</h3>
                <p>${message}</p>
                <button onclick="window.location.reload()" style="
                    background: var(--secondary-color);
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 5px;
                    cursor: pointer;
                    margin-top: 1rem;
                ">Try Again</button>
            `;
}

function loadTawkScript(propertyId, widgetId, callback) {
    // Load new script
    var Tawk_API = Tawk_API || {}, Tawk_LoadStart = new Date();
    window.Tawk_API = Tawk_API;

    var s1 = document.createElement("script");
    var s0 = document.getElementsByTagName("script")[0];
    s1.async = true;
    s1.src = `https://embed.tawk.to/${propertyId}/${widgetId || 'default'}`;
    s1.id = propertyId
    s1.charset = 'UTF-8';
    s1.setAttribute('crossorigin', '*');
    s0.parentNode.insertBefore(s1, s0);
    window.Tawk_API.onBeforeLoad = function () {
        window.Tawk_API.maximize();
    };

    if (callback) {
        window.Tawk_API.onLoad = callback;
    }

    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('chatStatus').textContent = 'Chat is now ready. Please use the chat window below.';


}


function tawkLogin(userData) {
    return new Promise((resolve, reject) => {
        console.log('in login')
        window.Tawk_API.login({
            hash: hashInBase64(userData.userId),
            userId: userData.userId,
            name: userData.name,
            email: userData.email,
            // phone: userData.phone
        }, function (error) {
            if (error) {
                console.error("Error setting attributes:", error);
                showError("Error initializing chat");
                reject(error);
            } else {
                document.getElementById('loadingScreen').style.display = 'none';
                document.getElementById('chatStatus').textContent = 'Chat is now ready. Please use the chat window below.';
                window.Tawk_API.switchWidget({
                    propertyId: userData.propertyId,
                    widgetId: userData.widgetId
                }, function (err) {
                    console.log(err, 'my error')
                    var Tawk_API = Tawk_API || {}, Tawk_LoadStart = new Date();
                    window.Tawk_API = Tawk_API;

                    var s1 = document.createElement("script");
                    var s0 = document.getElementsByTagName("script")[0];
                    s1.async = true;
                    s1.src = `https://embed.tawk.to/${userData.propertyId}/${userData.widgetId || 'default'}`;
                    s1.id = userData.propertyId
                    s1.charset = 'UTF-8';
                    s1.setAttribute('crossorigin', '*');
                    s0.parentNode.insertBefore(s1, s0);

                    window.Tawk_API.onLoad = function () {
                        window.Tawk_API.setAttributes({
                            hash: hashInBase64(userData.userId),
                            userId: userData.userId,
                            name: userData.name,
                            email: userData.email,
                            phone: userData.phone
                        })
                    }

                })


                resolve();
            }
        });

    });
}

// kedev46079@inkight.com
function tawkSetAttributes(userData) {
    return new Promise((resolve, reject) => {
        window.Tawk_API.setAttributes({
            hash: hashInBase64(userData.userId),
            userId: userData.userId,
            name: userData.name,
            email: userData.email,
            phone: userData.phone
        }, function (error) {
            if (error) {
                console.error("Error setting attributes:", error);
                reject(error);
            } else {

                resolve();
            }
        });

    });
}