// app.js

// Define the content for each page as a string
const pages = {
    'home': `
        <div style="background-color: gray; padding: 10px; border-radius: 10px;">
            <p style="font-size: medium; color: black; margin: 0;">Big updates to the MSST platform, though we're always "still in development."</p>
            <p style="font-size: medium; color: black; margin: 10px 0 0 0;">Read on and I'll detail everything. Trying to make this readable, but I can't promise a layman will fully understand.</p>
        </div>
        <h2>Down To The Core</h2>
        <p>Noting that the MSST project is nearing its 2 year anniversary, I've overhauled the entire thing. We're now featuring:</p>
        <ul>
            <li>A: AmpFlow P40-350 pancake motor at 400 watts cont., 650 watts peak</li>
            <li>B: Robust, high-current electrical infrastructure</li>
            <li>C: We've further modified the Ecoflow River 2 Max for this project! Read about it here <a href="#battery">[Battery]</a></li>
            <li>D: Victor 883 24V Motor Controller</li>
            <li>E: Arduino Mega board integration (Uno and Nano compatible), with comprehensive firmware</li>
            <li>F: 20x4 I2C LCD display, monophonic speaker</li>
            <li>G: Single-button control scheme (read on it here <a href="#the-button">[The Button]</a>)</li>
            <li>H: A dual-shock suspension on the seat</li>
        </ul>
        <h2>Plans</h2>
        <p>The only current plans are to finish documentation and make resources and designs available here for free and open-source the stable Arduino firmware.</p>
        <p><a href="#how-we-got-here">Read about how we got here</a></p>
    `,
    'how-we-got-here': `
        <h2>How We Got Here</h2>
        <p>MSST used to be a no-plan, no-idea-what-we're-doing system. I went: "Hey, I have this cheap scooter from a decade ago. The company's basically defunct. Why don't I try to make it work again?"... and then I soon realised I did not like the idea of using lead-acid batteries. They suck for these applications.</p>
        
        <h3>The Initial Build: A Series of Unfortunate Events</h3>
        <p>SO! I said then: "24 volts... what else is 24 volts? I've myself an Ecoflow River 2 Max. What's the battery voltage on that?" It was just over 24. Great! Ok. Awesome. So.... I tore apart an extension cable and used NEMA 1-15P connectors (horrible). The stock motor controller on that POS was slow, limited, and temperamental. You'd give it any extra load and it'd just error out. You want to accelerate quickly? Good luck. It constantly jittered if you went from low to a high speed due to amperage limits from the shitty NEMA standard wiring.</p>

        <h3>Major Upgrades: Wiring and a New Controller</h3>
        <p>So I bought 10 gauge wiring and equivalent connectors for the entire system! Boom. There you go. Almost. The motor controller blows up in smoke after around 3 months. I'm stuck hotfixing a SINGULAR SWITCH to the motor directly (oh) and just having On and Off as my speeds. I get SO sick of this, SO quickly. I go through some robotics junk and I rediscover the Victor 883. It's the 24 volt model (I'd be dead if it were not)! RC protocol communications and an 80 amp continuous current handling?!? Precision speed control and motor braking?! This is it.</p>
        
        <h3>Adding Intelligence: The Arduino and Beyond</h3>
        <p>But how do I control this? AN ARDUINO. BOOM. But how do I control the Arduino? And make this even tolerable to route the cables for on this thing? A SINGLE BUTTON? Boom. How do I get any feedback besides the motor? A SPEAKER? Boom. And a bit of code. This was MSST v4.0a. And it was the right step forward. A speaker wasn't quite enough. I wanted this to be "smarter". I wanted it to be a real, practical tool. So here comes the 20x4 backlit screen. Woah! High visibility in all lighting conditions. Brightness control. Easy, low-CPU-cost info display and user interface. Add a hall-effect to the front wheel for speed sensing! And here we are. An "intelligent" system, which actively calculates wattage and battery level (without actually knowing or measuring them...), actively adjusts motor power to compensate for steep inclines to keep you at/above your target speed, has security measures in the firmware, and persistent settings. Great. Now we are here.</p>

        <p><a href="#home">Back to Home</a></p>
    `,
    'battery': `
        <h2>The Battery</h2>
        <p>I'll start by once again clarifying that the battery used is the LiFePo4 pack from an Ecoflow River 2 Max. This includes the stock BMS board, but you can use your own as long as it meets the current spec. The original design uses the entire unit.</p>

        <h3>Internal Wiring and Connectors</h3>
        <p>You open the device, separate the mainboard and battery, hook 10-gauge-spec connectors (and the 10 gauge insulated copper wiring to them) to the BMS terminals (NOT the cell pack's unprotected terminals [though you will not kill the battery if you do it this way and mind your measurements.]). Make sure your connections are cleaned up and insulated, and make uniform contact. Route the cables out of the device in whatever way you wish. Re-assemble. If you chose not to do permanent damage to the case, you'll have a warranty-intact device so long as you take the new cables out before you send it off.</p>

        <h3>Alternative Battery Configuration</h3>
        <p>Alternatively, you can use the same type of connectors, and extra screws to separate the mainboard and battery into two separate devices. Then you don't have to have such a large block on your scooter, and you have a more "battery-sized" battery. I'm working on 3D models for cases for both.</p>

        <h3>Insulation and Padding</h3>
        <p>My insulation and padding spec for these custom cases is: Precisely cut Bubble wrap (or Amazon shipping bag with bubble in them, or other sender bags of the same material) to the shape of the area around the units. Pack it in there between the side and the device. Great! Now put cardboard in front of that. You can add more if you want. It goes on the front, back, bottom, sides, top,... I'll provide rough pictures soon.</p>

        <p><a href="#home">Back to Home</a></p>
    `,
    'the-button': `
        <h2>The Button</h2>
        <p>The button control system on MSST v4.0a and v5.1 works by using short and long presses for different commands.</p>

        <h3>Defining Press Types</h3>
        <p>A **short press** is a quick press-and-release. A **long press** is pressing and holding the button for over 500ms; the action will occur after 500ms even if you do not let go of the button. A **long press and release** is pressing and holding for 500ms, but the action will only occur when you release the button.</p>

        <h3>At a Standstill (Idle Dashboard)</h3>
        <p>When the scooter is at a standstill, a **long press** will open the settings menu. You must not be moving. To quickly exit (if you're on the Reverse option), simply long press again and let go. Short presses scroll through options (or change values) and long presses are like an "Enter" key. From a standstill at the idle dashboard, a **short press** will increment the speed target by whatever the interval of your Accel profile is set to. For Comfort, 1. Normal, this is 2. Sport, 4. TDE, 2. Eco, 2. The motor will kick on accordingly to the profile as well, and get you to the target speed. The screen will show your target and current speed. (In MPH. Firmware setting for KPH is being developed.) Sequential short presses will increment the speed target until it reaches its maximum value, then another short press will bring it down to the first value.</p>
        
        <h3>While Moving (Applying Throttle)</h3>
        <p>At any time the motor speed target is above 0 (you are intentionally applying throttle), a **long press and release** (about 500ms) will enter the **Soft Stop** phase, setting motor power to an extremely low value (but not entirely OFF). During this phase, the speaker will beep a low tone every half-second to signal to you that you are in this stage, and the screen will display "Soft Stop Hold to Stop". This way, you can naturally lose speed slowly. A **long press** *during* the Soft Stop stage will apply the motor brake, set the speed target to 0, and bring you to the Idle dashboard again. You can cancel Soft Stop by a **short press** and you will return to the first speed increment your profile allows.</p>

        <p><a href="#home">Back to Home</a></p>
    `
};

// Function to render the correct page content
function renderPage(pageName) {
    const contentDiv = document.getElementById('content');
    const pageContent = pages[pageName] || pages['home']; // Fallback to home if page doesn't exist
    contentDiv.innerHTML = pageContent;
}

// Handle initial page load based on URL hash
function handleHashChange() {
    const pageName = window.location.hash.substring(1) || 'home';
    renderPage(pageName);
}

// Add event listeners
window.addEventListener('hashchange', handleHashChange);
window.addEventListener('load', handleHashChange);