import {CartesianQuality, CartesianRainHistory, CartesianGaugeHistory} from '../src';
import {expect} from 'chai';
import {CartesianValue} from 'raain-model';
import {QualityTools} from '../src';


describe('CartesianQuality', () => {

    function getPreparedScenario(translation: number = 0) {
        const minDate = new Date(1000);
        const possibleGaugePositions = [[-0.1, -0.1]];
        const cartesianRainHistories = [];
        const cartesianGaugeHistories = [];
        for (let latitude = -1; latitude <= 1; latitude += 0.01) {
            for (let longitude = -1; longitude <= 1; longitude += 0.01) {

                // Precision pb in js
                latitude = QualityTools.roundLatLng(latitude);
                longitude = QualityTools.roundLatLng(longitude);
                const measureDate1 = new Date(minDate.getTime() + (latitude * 100));

                const gaugeIndex = QualityTools.indexOfDualArray(possibleGaugePositions, [latitude, longitude]);
                if (gaugeIndex >= 0) {
                    const cartesianGaugeHistory = new CartesianGaugeHistory(
                        'gauge' + gaugeIndex,
                        measureDate1,
                        new CartesianValue(5, latitude, longitude));
                    cartesianGaugeHistories.push(cartesianGaugeHistory);
                }
            }
        }

        for (let latitude = -1; latitude <= 1; latitude += 0.01) {
            for (let longitude = -1; longitude <= 1; longitude += 0.01) {

                // Precision pb in js
                latitude = QualityTools.roundLatLng(latitude);
                longitude = QualityTools.roundLatLng(longitude);

                const measureDate1 = new Date(minDate.getTime() + (latitude * 100));
                const measureDate2 = new Date(minDate.getTime() + 1 + (latitude * 100));
                let cartesianRainHistory = new CartesianRainHistory(
                    measureDate1,
                    measureDate2,
                    new CartesianValue(100, latitude, longitude));

                const gaugeIndex = QualityTools.indexOfDualArray(possibleGaugePositions,
                    [QualityTools.roundLatLng(latitude - translation), longitude]);
                if (gaugeIndex >= 0) {
                    cartesianRainHistory = new CartesianRainHistory(
                        measureDate1,
                        measureDate2,
                        new CartesianValue(5, latitude, longitude));
                }

                cartesianRainHistories.push(cartesianRainHistory);
            }
        }
        return {cartesianRainHistories, cartesianGaugeHistories};
    }

    it('should get default CartesianQuality', async () => {
        const cartesianQuality = new CartesianQuality([], []);
        const rainComputationQuality = await cartesianQuality.getRainComputationQuality();

        expect(rainComputationQuality.indicator).eq(0);
        expect(rainComputationQuality.points.length).eq(0);
        expect(rainComputationQuality.speed.speedMetersPerSec).eq(0);
        expect(rainComputationQuality.speed.angleDegrees).eq(0);
        expect(rainComputationQuality.maximums.rainMeasureValue).eq(undefined);
        expect(rainComputationQuality.maximums.gaugeMeasureValue).eq(undefined);

    });

    it('should get the most performant CartesianQuality when gauge === rain', async () => {

        // Prepare scenario : full map with 4 gauges
        const scenario = getPreparedScenario();

        // Compute the quality
        const cartesianQuality = new CartesianQuality(scenario.cartesianRainHistories, scenario.cartesianGaugeHistories);
        const rainComputationQuality = await cartesianQuality.getRainComputationQuality();

        // Verify results
        expect(rainComputationQuality.indicator).eq(0);
        expect(rainComputationQuality.points.length).eq(1);
        expect(rainComputationQuality.speed.speedMetersPerSec).eq(0);
        expect(rainComputationQuality.speed.angleDegrees).eq(0);
        expect(rainComputationQuality.maximums.rainMeasureValue).eq(5);
        expect(rainComputationQuality.maximums.gaugeMeasureValue).eq(5);

        expect(rainComputationQuality.points[0].gaugeId).eq('gauge0');
        expect(rainComputationQuality.points[0].gaugeCartesianValue.lat).eq(-0.1);
        expect(rainComputationQuality.points[0].gaugeCartesianValue.lng).eq(-0.1);
        expect(rainComputationQuality.points[0].gaugeCartesianValue.value).eq(5);
        expect(rainComputationQuality.points[0].rainCartesianValue.lat).eq(-0.1);
        expect(rainComputationQuality.points[0].rainCartesianValue.lng).eq(-0.1);
        expect(rainComputationQuality.points[0].rainCartesianValue.value).eq(5);
    }).timeout(20000);

    it('should get more challenging CartesianQuality', async () => {

        // Prepare scenario : full map with 4 gauges
        const scenario = getPreparedScenario(-0.05);

        // Compute the quality
        console.log(new Date().toISOString(), 'begin');
        const cartesianQuality = new CartesianQuality(scenario.cartesianRainHistories, scenario.cartesianGaugeHistories);
        const rainComputationQuality = await cartesianQuality.getRainComputationQuality();
        console.log(new Date().toISOString(), 'end');

        // Verify results
        expect(rainComputationQuality.indicator).eq(0);
        expect(rainComputationQuality.points.length).eq(1);
        expect(rainComputationQuality.speed.speedMetersPerSec).eq(61844.44444444444);
        expect(rainComputationQuality.speed.angleDegrees).eq(180);
        expect(rainComputationQuality.maximums.rainMeasureValue).eq(5);
        expect(rainComputationQuality.maximums.gaugeMeasureValue).eq(5);

        expect(rainComputationQuality.points.length).eq(1);
        expect(rainComputationQuality.points[0].gaugeId).eq('gauge0');
        expect(rainComputationQuality.points[0].rainCartesianValue.value).eq(5);
        expect(rainComputationQuality.points[0].rainCartesianValue.lat).eq(-0.15);
        expect(rainComputationQuality.points[0].rainCartesianValue.lng).eq(-0.1);
        expect(rainComputationQuality.points[0].gaugeCartesianValue.value).eq(5);
        expect(rainComputationQuality.points[0].gaugeCartesianValue.lat).eq(-0.1);
        expect(rainComputationQuality.points[0].gaugeCartesianValue.lng).eq(-0.1);

        // Get the cached result
        const rainComputationQualityCached = await cartesianQuality.getRainComputationQuality();

        // Verify same results
        expect(rainComputationQuality).eq(rainComputationQualityCached);
    }).timeout(20000);

});