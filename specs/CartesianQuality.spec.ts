import {CartesianGaugeHistory, CartesianQuality, CartesianRainHistory, QualityTools, SpeedComparator} from '../src';
import {expect} from 'chai';
import {CartesianValue} from 'raain-model';


describe('CartesianQuality', () => {

    function prepareGauges(latLngMin, latLngMax, scale, date, possibleGaugePositions) {
        const cartesianGaugeHistories = [];
        for (let latitude = latLngMin; latitude <= latLngMax; latitude += scale) {
            for (let longitude = latLngMin; longitude <= latLngMax; longitude += scale) {

                latitude = QualityTools.roundLatLng(latitude);
                longitude = QualityTools.roundLatLng(longitude);
                const measureDate1 = new Date(date.getTime() + 5 * 60 * 1000); // +5mn

                const gaugeIndex = QualityTools.indexOfDualArray(possibleGaugePositions, [latitude, longitude]);
                if (gaugeIndex >= 0) {
                    const cartesianGaugeHistory = new CartesianGaugeHistory(
                        'gauge' + gaugeIndex,
                        measureDate1,
                        new CartesianValue(gaugeIndex + 5, latitude, longitude));
                    cartesianGaugeHistories.push(cartesianGaugeHistory);
                }
            }
        }
        return cartesianGaugeHistories;
    }

    function prepareRains(latLngMin, latLngMax, scale, date, possibleGaugePositions, gaugeTranslation) {
        const cartesianRainHistories = [];
        for (let latitude = latLngMin; latitude <= latLngMax; latitude += scale) {
            for (let longitude = latLngMin; longitude <= latLngMax; longitude += scale) {

                latitude = QualityTools.roundLatLng(latitude);
                longitude = QualityTools.roundLatLng(longitude);

                const measureDate1 = new Date(date.getTime());
                const measureDate2 = new Date(date.getTime() + 10 * 60 * 1000); // +10mn
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
                        new CartesianValue(gaugeIndex + 7, latitude, longitude));
                }

                cartesianRainHistories.push(cartesianRainHistory);
            }
        }
        return cartesianRainHistories;
    }

    function getPreparedScenario(latLngMin = -1, latLngMax = 1, scale = CartesianQuality.DEFAULT_SCALE, gaugeTranslation: number = 0) {
        const minDate = new Date(0);
        const possibleGaugePositions = [[latLngMax - 0.1, latLngMax - 0.1]];
        const cartesianGaugeHistories = [];
        const cartesianRainHistories = [];

        // Gauges
        for (let mnStep = 0; mnStep < 20; mnStep += 5) {
            const gaugeDate = new Date(minDate);
            gaugeDate.setMinutes(gaugeDate.getMinutes() + mnStep);
            cartesianGaugeHistories.push.apply(cartesianGaugeHistories,
                prepareGauges(latLngMin, latLngMax, scale, gaugeDate, possibleGaugePositions));
        }

        // Rains
        for (let mnStep = 0; mnStep < 30; mnStep += 10) {
            const rainDate = new Date(minDate);
            rainDate.setMinutes(rainDate.getMinutes() + mnStep);
            cartesianRainHistories.push.apply(cartesianRainHistories,
                prepareRains(latLngMin, latLngMax, scale, rainDate, possibleGaugePositions, gaugeTranslation));
        }

        return {cartesianRainHistories, cartesianGaugeHistories};
    }

    it('should getAssociatedRainCartesianHistory', async () => {

        const sharedScale = 0.1;
        const scenario = getPreparedScenario(40, 42, sharedScale, -0.1);
        const speedComparator = new SpeedComparator(0, 0, -5, -10);

        const cartesianQuality = new CartesianQuality(scenario.cartesianRainHistories, scenario.cartesianGaugeHistories, sharedScale);
        const gaugeHistory = scenario.cartesianGaugeHistories[0];
        const cartesianRainHistory = await cartesianQuality.getAssociatedRainCartesianHistory(
            gaugeHistory, speedComparator, sharedScale);

        expect(cartesianRainHistory.computedValue.value).equal(100);
        expect(cartesianRainHistory.computedValue.lat).equal(41.4);
        expect(cartesianRainHistory.computedValue.lng).equal(40.9);

    });

    it('should GetBestAssociatedRainCartesianHistory', async () => {

        const sharedScale = 0.1;
        const gaugeTranslation = -0.2;
        const scenario = getPreparedScenario(40, 42, sharedScale, gaugeTranslation);
        const gaugeHistory = scenario.cartesianGaugeHistories[0];
        expect(gaugeHistory.value.value).equal(5);
        expect(gaugeHistory.value.lat).equal(41.9);
        expect(gaugeHistory.value.lng).equal(41.9);
        expect(gaugeHistory.date.getTime()).equal(300000);

        const cartesianRainHistory = CartesianQuality.GetBestAssociatedRainCartesianHistory(
            gaugeHistory, scenario.cartesianRainHistories, sharedScale);

        expect(cartesianRainHistory.computedValue.value).equal(7);
        expect(cartesianRainHistory.computedValue.lat).equal(41.7); // linked to gaugeTranslation
        expect(cartesianRainHistory.computedValue.lng).equal(41.9);
        expect(cartesianRainHistory.periodBegin.getTime()).equal(0);
        expect(cartesianRainHistory.periodEnd.getTime()).equal(600000);
        expect(scenario.cartesianRainHistories.indexOf(cartesianRainHistory)).equals(376);

    });

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
        expect(rainComputationQuality.indicator).eq(2);
        expect(rainComputationQuality.points.length).eq(4);
        expect(rainComputationQuality.maximums.rainMeasureValue).eq(7);
        expect(rainComputationQuality.maximums.gaugeMeasureValue).eq(5);

        expect(rainComputationQuality.points[0].gaugeId).eq('gauge0');
        expect(rainComputationQuality.points[0].gaugeCartesianValue.lat).eq(0.9);
        expect(rainComputationQuality.points[0].gaugeCartesianValue.lng).eq(0.9);
        expect(rainComputationQuality.points[0].gaugeCartesianValue.value).eq(5);
        expect(rainComputationQuality.points[0].rainCartesianValue.lat).eq(0.9);
        expect(rainComputationQuality.points[0].rainCartesianValue.lng).eq(0.9);
        expect(rainComputationQuality.points[0].rainCartesianValue.value).eq(7);
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
        expect(rainComputationQuality.indicator).eq(2);
        expect(rainComputationQuality.maximums.rainMeasureValue).eq(7);
        expect(rainComputationQuality.maximums.gaugeMeasureValue).eq(5);

        expect(rainComputationQuality.points.length).eq(4);
        expect(rainComputationQuality.points[0].gaugeId).eq('gauge0');
        expect(rainComputationQuality.points[0].rainCartesianValue.value).eq(7);
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
        expect(rainComputationQuality.indicator).eq(2);
        expect(rainComputationQuality.maximums.rainMeasureValue).eq(7);
        expect(rainComputationQuality.maximums.gaugeMeasureValue).eq(5);

        expect(rainComputationQuality.points.length).eq(4);
        expect(rainComputationQuality.points[0].gaugeId).eq('gauge0');
        expect(rainComputationQuality.points[0].rainCartesianValue.value).eq(7);
        expect(rainComputationQuality.points[0].rainCartesianValue.lat).eq(41.85);
        expect(rainComputationQuality.points[0].rainCartesianValue.lng).eq(41.9);
        expect(rainComputationQuality.points[0].gaugeCartesianValue.value).eq(5);
        expect(rainComputationQuality.points[0].gaugeCartesianValue.lat).eq(41.9);
        expect(rainComputationQuality.points[0].gaugeCartesianValue.lng).eq(41.9);

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
        expect(rainComputationQuality.indicator).eq(2);
        expect(rainComputationQuality.maximums.rainMeasureValue).eq(7);
        expect(rainComputationQuality.maximums.gaugeMeasureValue).eq(5);

        expect(rainComputationQuality.points.length).eq(4);
        expect(rainComputationQuality.points[0].gaugeId).eq('gauge0');
        expect(rainComputationQuality.points[0].rainCartesianValue.value).eq(7);
        expect(rainComputationQuality.points[0].rainCartesianValue.lat).eq(41.8);
        expect(rainComputationQuality.points[0].rainCartesianValue.lng).eq(41.9);
        expect(rainComputationQuality.points[0].gaugeCartesianValue.value).eq(5);
        expect(rainComputationQuality.points[0].gaugeCartesianValue.lat).eq(41.9);
        expect(rainComputationQuality.points[0].gaugeCartesianValue.lng).eq(41.9);

        // Get the cached result
        const rainComputationQualityCached = await cartesianQuality.getRainComputationQuality();

        // Verify same results
        expect(rainComputationQuality).eq(rainComputationQualityCached);
    });


});
