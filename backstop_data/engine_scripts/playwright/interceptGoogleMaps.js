const interceptPattern = /maps\.googleapis\.com/i;

module.exports = async function (page, scenario) {
    const intercept = async (route) => {
        await route.abort();
    };

    page.route(interceptPattern, (route) => {
        intercept(route);
    });
};
