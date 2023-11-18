const msgpack = require('msgpack-lite');
const path = require('path');
const {readFileSync} = require("node:fs");
const {CartesianQuality} = require("../dist");

const main = async () => {

    const {cartesianGaugeHistories} = require('./files/555555b00000000000000010-cartesianGaugeHistories-2023-11-10T21:14:03.565Z.gitignored.json');
    const msgpack = require('msgpack-lite');
    const fileName = path.resolve(__dirname, './files/555555b00000000000000010-cartesianRainHistories-2023-11-10T21:14:03.696Z.gitignored.encoded.json');
    const cartesianRainHistoriesEncoded = readFileSync(fileName);
    //  const cartesianRainHistoriesEncoded =
    // require('./files/555555b00000000000000010-cartesianRainHistories-2023-11-10T21:14:03.696Z.gitignored.encoded.json')
    const {cartesianRainHistories} = msgpack.decode(cartesianRainHistoriesEncoded);

    // Compute different qualities
    const cartesianQuality = new CartesianQuality(cartesianRainHistories, cartesianGaugeHistories);
    const dates = cartesianQuality.getRainDates();
    for (const stepDate of dates) {
        await cartesianQuality.getRainComputationQuality(stepDate);
    }

    // Verify results
    cartesianQuality.logQualities({animate: true});
}

main();

