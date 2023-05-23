import {CartesianGaugeHistory, CartesianQuality, CartesianRainHistory, QualityTools} from '../src';
import {expect} from 'chai';
import {CartesianValue} from 'raain-model';


describe('CartesianQuality', () => {

    function getPreparedScenario(latLngMin = -1, latLngMax = 1, scale = CartesianQuality.DEFAULT_SCALE, gaugeTranslation: number = 0) {
        const minDate = new Date(0);
        const possibleGaugePositions = [[latLngMax - 0.1, latLngMax - 0.1]];
        const cartesianRainHistories = [];
        const cartesianGaugeHistories = [];

        // Gauges
        for (let latitude = latLngMin; latitude <= latLngMax; latitude += scale) {
            for (let longitude = latLngMin; longitude <= latLngMax; longitude += scale) {

                latitude = QualityTools.roundLatLng(latitude);
                longitude = QualityTools.roundLatLng(longitude);
                const measureDate1 = new Date(minDate.getTime() + 5 * 60 * 1000); // +5mn

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

        // Rains
        for (let latitude = latLngMin; latitude <= latLngMax; latitude += scale) {
            for (let longitude = latLngMin; longitude <= latLngMax; longitude += scale) {

                latitude = QualityTools.roundLatLng(latitude);
                longitude = QualityTools.roundLatLng(longitude);

                const measureDate1 = new Date(minDate.getTime());
                const measureDate2 = new Date(minDate.getTime() + 10 * 60 * 1000); // +10mn
                let cartesianRainHistory = new CartesianRainHistory(
                    measureDate1,
                    measureDate2,
                    new CartesianValue(100, latitude, longitude));

                const gaugeIndex = QualityTools.indexOfDualArray(possibleGaugePositions,
                    [QualityTools.roundLatLng(latitude - gaugeTranslation), longitude]);
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
        const cartesianQuality = new CartesianQuality([], [], 0.4);
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
        const cartesianQuality = new CartesianQuality(scenario.cartesianRainHistories, scenario.cartesianGaugeHistories, 0.04);
        const rainComputationQuality = await cartesianQuality.getRainComputationQuality();

        // Verify results
        expect(rainComputationQuality.indicator).eq(0);
        expect(rainComputationQuality.points.length).eq(1);
        expect(rainComputationQuality.speed.speedMetersPerSec).eq(0);
        expect(rainComputationQuality.speed.angleDegrees).eq(0);
        expect(rainComputationQuality.maximums.rainMeasureValue).eq(5);
        expect(rainComputationQuality.maximums.gaugeMeasureValue).eq(5);

        expect(rainComputationQuality.points[0].gaugeId).eq('gauge0');
        expect(rainComputationQuality.points[0].gaugeCartesianValue.lat).eq(0.9);
        expect(rainComputationQuality.points[0].gaugeCartesianValue.lng).eq(0.9);
        expect(rainComputationQuality.points[0].gaugeCartesianValue.value).eq(5);
        expect(rainComputationQuality.points[0].rainCartesianValue.lat).eq(0.9);
        expect(rainComputationQuality.points[0].rainCartesianValue.lng).eq(0.9);
        expect(rainComputationQuality.points[0].rainCartesianValue.value).eq(5);
    });

    it('should get more challenging CartesianQuality', async () => {

        // Prepare scenario : full map with 4 gauges
        const scenario = getPreparedScenario(-1, +1, CartesianQuality.DEFAULT_SCALE, -0.05);

        // Compute the quality
        console.log(new Date().toISOString(), 'begin');
        const cartesianQuality = new CartesianQuality(scenario.cartesianRainHistories, scenario.cartesianGaugeHistories);
        const rainComputationQuality = await cartesianQuality.getRainComputationQuality();
        console.log(new Date().toISOString(), 'end');

        // Verify results
        expect(rainComputationQuality.indicator).eq(0);
        expect(rainComputationQuality.points.length).eq(1);
        // 0.05 latitude in 5mn => (approx) 5km in 5mn (300000 ms) => 16 m/s
        expect(rainComputationQuality.speed.speedMetersPerSec).eq(16.666666666666668);
        expect(rainComputationQuality.speed.angleDegrees).eq(180);
        expect(rainComputationQuality.maximums.rainMeasureValue).eq(5);
        expect(rainComputationQuality.maximums.gaugeMeasureValue).eq(5);

        expect(rainComputationQuality.points.length).eq(1);
        expect(rainComputationQuality.points[0].gaugeId).eq('gauge0');
        expect(rainComputationQuality.points[0].rainCartesianValue.value).eq(5);
        expect(rainComputationQuality.points[0].rainCartesianValue.lat).eq(0.85);
        expect(rainComputationQuality.points[0].rainCartesianValue.lng).eq(0.9);
        expect(rainComputationQuality.points[0].gaugeCartesianValue.value).eq(5);
        expect(rainComputationQuality.points[0].gaugeCartesianValue.lat).eq(0.9);
        expect(rainComputationQuality.points[0].gaugeCartesianValue.lng).eq(0.9);

        // Get the cached result
        const rainComputationQualityCached = await cartesianQuality.getRainComputationQuality();

        // Verify same results
        expect(rainComputationQuality).eq(rainComputationQualityCached);
    });

    it('should get same CartesianQuality when translated', async () => {

        // Prepare scenario : full map with 4 gauges
        const scenario = getPreparedScenario(40, 42, CartesianQuality.DEFAULT_SCALE, -0.05);

        // Compute the quality
        console.log(new Date().toISOString(), 'begin');
        const cartesianQuality = new CartesianQuality(
            scenario.cartesianRainHistories, scenario.cartesianGaugeHistories, CartesianQuality.DEFAULT_SCALE);
        const rainComputationQuality = await cartesianQuality.getRainComputationQuality();
        console.log(new Date().toISOString(), 'end');

        // Verify results
        expect(rainComputationQuality.indicator).eq(0);
        expect(rainComputationQuality.points.length).eq(1);
        expect(rainComputationQuality.speed.speedMetersPerSec).eq(16.666666666666668);
        expect(rainComputationQuality.speed.angleDegrees).eq(180);
        expect(rainComputationQuality.maximums.rainMeasureValue).eq(5);
        expect(rainComputationQuality.maximums.gaugeMeasureValue).eq(5);

        expect(rainComputationQuality.points.length).eq(1);
        expect(rainComputationQuality.points[0].gaugeId).eq('gauge0');
        expect(rainComputationQuality.points[0].rainCartesianValue.value).eq(5);
        expect(rainComputationQuality.points[0].rainCartesianValue.lat).eq(41.85);
        expect(rainComputationQuality.points[0].rainCartesianValue.lng).eq(41.9);
        expect(rainComputationQuality.points[0].gaugeCartesianValue.value).eq(5);
        expect(rainComputationQuality.points[0].gaugeCartesianValue.lat).eq(-0.1);
        expect(rainComputationQuality.points[0].gaugeCartesianValue.lng).eq(-0.1);

        // Get the cached result
        const rainComputationQualityCached = await cartesianQuality.getRainComputationQuality();

        // Verify same results
        expect(rainComputationQuality).eq(rainComputationQualityCached);
    });

    it('should get same CartesianQuality when translated and scaled same way', async () => {

        // Prepare scenario : full map with 4 gauges
        const sharedScale = 0.1;
        const scenario = getPreparedScenario(40, 42, sharedScale, -0.1);

        // Compute the quality
        console.log(new Date().toISOString(), 'begin');
        const cartesianQuality = new CartesianQuality(scenario.cartesianRainHistories, scenario.cartesianGaugeHistories, sharedScale);
        const rainComputationQuality = await cartesianQuality.getRainComputationQuality();
        console.log(new Date().toISOString(), 'end');

        // Verify results
        expect(rainComputationQuality.indicator).eq(0);
        expect(rainComputationQuality.points.length).eq(1);
        expect(rainComputationQuality.speed.speedMetersPerSec).eq(33.33333333333333);
        expect(rainComputationQuality.speed.angleDegrees).eq(180);
        expect(rainComputationQuality.maximums.rainMeasureValue).eq(5);
        expect(rainComputationQuality.maximums.gaugeMeasureValue).eq(5);

        expect(rainComputationQuality.points.length).eq(1);
        expect(rainComputationQuality.points[0].gaugeId).eq('gauge0');
        expect(rainComputationQuality.points[0].rainCartesianValue.value).eq(5);
        expect(rainComputationQuality.points[0].rainCartesianValue.lat).eq(41.8);
        expect(rainComputationQuality.points[0].rainCartesianValue.lng).eq(41.9);
        expect(rainComputationQuality.points[0].gaugeCartesianValue.value).eq(5);
        expect(rainComputationQuality.points[0].gaugeCartesianValue.lat).eq(-0.1);
        expect(rainComputationQuality.points[0].gaugeCartesianValue.lng).eq(-0.1);

        // Get the cached result
        const rainComputationQualityCached = await cartesianQuality.getRainComputationQuality();

        // Verify same results
        expect(rainComputationQuality).eq(rainComputationQualityCached);
    });

    it('should get another challenging CartesianQuality with an asymmetric ratio', async () => {

        // Prepare scenario : full map with 4 gauges
        const scenario = getPreparedScenario(-1, +1, 0.01, -0.04);

        // Compute the quality
        console.log(new Date().toISOString(), 'begin');
        const cartesianQuality = new CartesianQuality(scenario.cartesianRainHistories, scenario.cartesianGaugeHistories, 0.02);
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
    });


    it('should get same asymmetric CartesianQuality when translated', async () => {

        // Prepare scenario : full map with 4 gauges
        const scenario = getPreparedScenario(40, 42, 0.01, -0.05);

        // Compute the quality
        console.log(new Date().toISOString(), 'begin');
        const cartesianQuality = new CartesianQuality(scenario.cartesianRainHistories, scenario.cartesianGaugeHistories, 0.04);
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
    });

});
