const YAML = require('yaml');
const fs = require('fs');
const backstop = require('backstopjs');
const readline = require('readline');
let isRunning = false;

// https://stackoverflow.com/a/40560590
const logStyle = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    underscore: "\x1b[4m",
    blink: "\x1b[5m",
    reverse: "\x1b[7m",
    hidden: "\x1b[8m",
    fg: {
        black: "\x1b[30m",
        red: "\x1b[31m",
        green: "\x1b[32m",
        yellow: "\x1b[33m",
        blue: "\x1b[34m",
        magenta: "\x1b[35m",
        cyan: "\x1b[36m",
        white: "\x1b[37m",
        crimson: "\x1b[38m"
    },
    bg: {
        black: "\x1b[40m",
        red: "\x1b[41m",
        green: "\x1b[42m",
        yellow: "\x1b[43m",
        blue: "\x1b[44m",
        magenta: "\x1b[45m",
        cyan: "\x1b[46m",
        white: "\x1b[47m",
        crimson: "\x1b[48m"
    }
};

// http://logan.tw/posts/2015/12/12/read-lines-from-stdin-in-nodejs/
let rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

const file = fs.readFileSync('nyu.yml', 'utf8');
const parsed = YAML.parse(file);
const scenarios = parsed.urls;

console.log(`${logStyle.fg.green}${scenarios.length} scenario${scenarios.length === 1 ? "" : "s"} loaded${logStyle.reset}`);

const defaultConfig = {
    // paths: {
    //     bitmaps_reference: "backstop_data/bitmaps_reference",
    //     bitmaps_test: "backstop_data/bitmaps_test",
    //     engine_scripts: "backstop_data/engine_scripts",
    //     html_report: "backstop_data/html_report",
    //     ci_report: "backstop_data/ci_report"
    // },
    report: ["browser"],
    engine: "puppeteer",
    engineOptions: {
        "args": ["--no-sandbox"]
    },
    asyncCaptureLimit: 20,
    asyncCompareLimit: 100,
    debug: false,
    debugWindow: false
}

function typeInKeywordToStartPrompt() {
    console.log(`${logStyle.fg.white}Type in a keyword to start: "test" (t), "approve" (a), "reference" (r)${logStyle.reset}`);
}

function runBackstop(scenario, action = "test") {
    let parsedAction = action.toLowerCase()

    isRunning = true;

    if (parsedAction === "t") {
        parsedAction = "test";
    } else if (parsedAction === "a") {
        parsedAction = "approve";
    } else if (parsedAction === "r") {
        parsedAction = "reference";
    } else if (!["test", "approve", "reference"].includes(parsedAction)) {
        console.log(`${logStyle.fg.red}Please type in a valid keyword: "test" (t), "approve" (a), "reference" (r)${logStyle.reset}`);
        isRunning = false;
        return;
    }

    console.log(`${logStyle.fg.white}Running ${parsedAction.toUpperCase()} for ${scenario.name}${logStyle.reset}`);

    const name = scenario.name.replace(/\s/g, "_")

    let config = Object.assign({}, defaultConfig);

    config.viewports = scenario["screen_sizes"].map((screenSizeStr) => {
        const match = screenSizeStr.match(/([1-9][0-9]*)x([1-9][0-9]*)/);
        return {
            label: screenSizeStr,
            width: parseInt(match[1]),
            height: parseInt(match[2])
        };
    });

    config.paths = {
        bitmaps_reference: `backstop_data/bitmaps_reference/${name}`,
        bitmaps_test: `backstop_data/bitmaps_test/${name}`,
        engine_scripts: `backstop_data/engine_scripts/${name}`,
        html_report: `backstop_data/html_report/${name}`,
        ci_report: `backstop_data/ci_report/${name}`
    };

    config.scenarios = [
        {
            label: name,
            cookiePath: "",
            url: scenario.url1,
            referenceUrl: scenario.url2,
            readyEvent: "",
            readySelector: "",
            delay: parseInt(scenario.delay || "0") === 0 ? 0 : 3000,
            hideSelectors: [],
            removeSelectors: [],
            hoverSelector: "",
            clickSelector: "",
            postInteractionWait: 0,
            selectors: [],
            selectorExpansion: true,
            expect: 0,
            misMatchThreshold : 0.1,
            requireSameDimensions: true
        }
    ];

    backstop(parsedAction, {config: config})
        .then(() => {
            console.log(`${logStyle.fg.green}${parsedAction.toUpperCase()} succeeded for ${scenario.name}${logStyle.reset}`);
            isRunning = false;
            typeInKeywordToStartPrompt();
        }).catch(() => {
            console.log(`${logStyle.fg.red}${parsedAction.toUpperCase()} failed for ${scenario.name}${logStyle.reset}`);
            isRunning = false;
            typeInKeywordToStartPrompt();
        }
    );
}

typeInKeywordToStartPrompt();

rl.on('line', (line) => {
    if (!isRunning) {
        runBackstop(scenarios[1], line);
    }
});