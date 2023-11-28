const path = require('path');
const {readFileSync, readdirSync} = require("node:fs");
const {CartesianQuality, LatLng, Converter, CartesianRainHistory} = require("../dist");
const {RainPolarMeasureValue} = require("raain-model");

const main = async () => {

    // read files
    let cartesianGaugeHistories, center, lastDate;
    const measures = [];
    const filesPath = path.resolve(__dirname, 'files');
    const files = readdirSync(filesPath, {withFileTypes: true});
    for (const file of files) {
        if (file.isFile() && file.name.indexOf('cartesianGaugeHistories') >= 0) {
            cartesianGaugeHistories = require(path.resolve(filesPath, file.name)).cartesianGaugeHistories;
        }
        if (file.isFile() && file.name.indexOf('rainNode') >= 0) {
            const rainNode = require(path.resolve(filesPath, file.name)).rainNode;
            center = new LatLng(rainNode.latitude, rainNode.longitude);
        }
        if (file.isFile() && file.name.indexOf('rainPolarMeasureValues') >= 0) {
            lastDate = new Date(file.name.substring(file.name.indexOf('.snap.') + 6, file.name.indexOf('.json')));
            const data = require(path.resolve(filesPath, file.name)).rainPolarMeasureValues.polars;
            const rainPolarMeasureValue = new RainPolarMeasureValue(data);
            const periodEnd = new Date(lastDate);
            periodEnd.setMinutes(lastDate.getMinutes() + 5); // TODO 5mn debt
            measures.push({periodBegin: lastDate, periodEnd, rainPolarMeasureValue});
        }
    }

    // Polar => Cartesian
    let cartesianPixelWidth;
    const cartesianRainHistories = [];
    for (const measure of measures) {
        const converter = new Converter(center, measure.rainPolarMeasureValue);
        const cartesianMeasureValue = converter.getCartesianMeasureValue();
        cartesianPixelWidth = converter.getCartesianPixelWidth();
        for (const cv of cartesianMeasureValue.getCartesianValues()) {
            const cartesianRainHistory = new CartesianRainHistory(measure.periodBegin, measure.periodEnd, cv);
            cartesianRainHistories.push(cartesianRainHistory);
        }
    }

    // Compute different qualities
    cartesianGaugeHistories = cartesianGaugeHistories.filter(h => h.gaugeId === 'PL10'); // TODO special filter for test
    const cartesianQuality = new CartesianQuality(cartesianRainHistories, cartesianGaugeHistories, cartesianPixelWidth);
    const dates = cartesianQuality.getRainDates();
    for (const stepDate of dates) {
        const rainQuality = await cartesianQuality.getRainComputationQuality(stepDate);
    }

    // Verify results
    cartesianQuality.logQualities({animate: true});
}

main();

