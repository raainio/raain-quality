import {CartesianGaugeHistory, CartesianQuality, CartesianRainHistory, QualityTools} from '../src';
import {expect} from 'chai';
import {CartesianValue} from 'raain-model';


describe('CartesianQuality', () => {

    function prepareGauges(latLngMin, latLngMax, scale, date, possibleGaugePositions) {
        const cartesianGaugeHistories = [];
        for (let latitude = latLngMin; latitude <= latLngMax; latitude += scale) {
            for (let longitude = latLngMin; longitude <= latLngMax; longitude += scale) {

                latitude = QualityTools.roundLatLng(latitude);
                longitude = QualityTools.roundLatLng(longitude);
                const measureDate1 = new Date(date.getTime() + 2 * 60 * 1000); // +2mn

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
                const measureDate2 = new Date(date.getTime() + 5 * 60 * 1000); // +5mn
                let cartesianRainHistory = new CartesianRainHistory(
                    measureDate1,
                    measureDate2,
                    new CartesianValue(120, latitude, longitude));

                const gaugeIndex = QualityTools.indexOfDualArray(possibleGaugePositions,
                    [QualityTools.roundLatLng(latitude - gaugeTranslation), longitude]);
                if (gaugeIndex >= 0) {
                    cartesianRainHistory = new CartesianRainHistory(
                        measureDate1,
                        measureDate2,
                        new CartesianValue(gaugeIndex + 12, latitude, longitude));
                }

                cartesianRainHistories.push(cartesianRainHistory);
            }
        }
        return cartesianRainHistories;
    }

    function getPreparedScenario(latLngMin = -0.1,
                                 latLngMax = 0.1,
                                 scale = CartesianQuality.DEFAULT_SCALE,
                                 gaugeTranslation: number = 0,
                                 gaugeCount = 1) {
        const minDate = new Date(0);
        const possibleGaugePositions = [[
            QualityTools.roundLatLng(latLngMin + scale),
            QualityTools.roundLatLng(latLngMax - scale)]];
        const cartesianGaugeHistories = [];
        const cartesianRainHistories = [];
        for (let i = 2; i <= gaugeCount; i++) {
            possibleGaugePositions.push([
                QualityTools.roundLatLng(latLngMin + i * scale),
                QualityTools.roundLatLng(latLngMax - i * scale)]);
        }

        // Gauges
        for (let mnStep = 0; mnStep < 30; mnStep += 5) {
            const gaugeDate = new Date(minDate);
            gaugeDate.setMinutes(gaugeDate.getMinutes() + mnStep);
            cartesianGaugeHistories.push.apply(cartesianGaugeHistories,
                prepareGauges(latLngMin, latLngMax, scale, gaugeDate, possibleGaugePositions));
        }

        // Rains
        for (let mnStep = 0; mnStep < 30; mnStep += 5) {
            const rainDate = new Date(minDate);
            rainDate.setMinutes(rainDate.getMinutes() + mnStep);
            cartesianRainHistories.push.apply(cartesianRainHistories,
                prepareRains(latLngMin, latLngMax, scale, rainDate, possibleGaugePositions, gaugeTranslation));
        }

        return {cartesianRainHistories, cartesianGaugeHistories};
    }

    it('should get default CartesianQuality', async () => {
        const cartesianQuality = new CartesianQuality([], []);
        const rainComputationQuality = await cartesianQuality.getRainComputationQuality();

        expect(rainComputationQuality.quality).eq(0);
        expect(rainComputationQuality.qualitySpeedMatrix).undefined;
        expect(rainComputationQuality.maximums.rainMeasureValue).undefined;
        expect(rainComputationQuality.maximums.gaugeMeasureValue).undefined;

    });

    it('should get the most performant CartesianQuality when gauge === rain', async () => {

        // Prepare scenario : full map with 1 gauge
        const scenario = getPreparedScenario();

        // Compute the quality
        const cartesianQuality = new CartesianQuality(scenario.cartesianRainHistories, scenario.cartesianGaugeHistories);
        const rainComputationQuality = await cartesianQuality.getRainComputationQuality();

        // Verify results
        expect(rainComputationQuality.quality).eq(42);
        expect(rainComputationQuality.qualitySpeedMatrix.getQualityPoints().length).eq(1);
        expect(rainComputationQuality.maximums.rainMeasureValue).eq(72);
        expect(rainComputationQuality.maximums.gaugeMeasureValue).eq(30);

        expect(rainComputationQuality.qualitySpeedMatrix.getQualityPoints().length).eq(1);
        expect(rainComputationQuality.qualitySpeedMatrix.getQualityPoints()[0].gaugeId).eq('gauge0');
        expect(rainComputationQuality.qualitySpeedMatrix.getQualityPoints()[0].rainCartesianValue.value).eq(72);
        expect(rainComputationQuality.qualitySpeedMatrix.getQualityPoints()[0].rainCartesianValue.lat).eq(-0.09);
        expect(rainComputationQuality.qualitySpeedMatrix.getQualityPoints()[0].rainCartesianValue.lng).eq(0.09);
        expect(rainComputationQuality.qualitySpeedMatrix.getQualityPoints()[0].gaugeCartesianValue.value).eq(30);
        expect(rainComputationQuality.qualitySpeedMatrix.getQualityPoints()[0].gaugeCartesianValue.lat).eq(-0.09);
        expect(rainComputationQuality.qualitySpeedMatrix.getQualityPoints()[0].gaugeCartesianValue.lng).eq(0.09);
    });

    it('should get more challenging CartesianQuality', async () => {

        // Prepare scenario : full map with 4 gauges
        const scenario = getPreparedScenario(-1, +1, CartesianQuality.DEFAULT_SCALE, 0, 4);

        // Compute the quality
        console.log(new Date().toISOString(), 'begin');
        const cartesianQuality = new CartesianQuality(scenario.cartesianRainHistories, scenario.cartesianGaugeHistories);
        const rainComputationQuality = await cartesianQuality.getRainComputationQuality();
        console.log(new Date().toISOString(), 'end');

        // Verify results
        expect(rainComputationQuality.quality).eq(42);
        expect(rainComputationQuality.maximums.rainMeasureValue).eq(90);
        expect(rainComputationQuality.maximums.gaugeMeasureValue).eq(48);

        expect(rainComputationQuality.qualitySpeedMatrix.getQualityPoints().length).eq(4);
        expect(rainComputationQuality.qualitySpeedMatrix.getQualityPoints()[0].gaugeId).eq('gauge0');
        expect(rainComputationQuality.qualitySpeedMatrix.getQualityPoints()[0].rainCartesianValue.value).eq(72);
        expect(rainComputationQuality.qualitySpeedMatrix.getQualityPoints()[0].rainCartesianValue.lat).eq(-0.99);
        expect(rainComputationQuality.qualitySpeedMatrix.getQualityPoints()[0].rainCartesianValue.lng).eq(0.99);
        expect(rainComputationQuality.qualitySpeedMatrix.getQualityPoints()[0].gaugeCartesianValue.value).eq(30);
        expect(rainComputationQuality.qualitySpeedMatrix.getQualityPoints()[0].gaugeCartesianValue.lat).eq(-0.99);
        expect(rainComputationQuality.qualitySpeedMatrix.getQualityPoints()[0].gaugeCartesianValue.lng).eq(0.99);
        expect(rainComputationQuality.qualitySpeedMatrix.getQualityPoints()[0].speed.x).eq(0);
        expect(rainComputationQuality.qualitySpeedMatrix.getQualityPoints()[0].speed.y).eq(0);

        // Get the cached result
        const rainComputationQualityCached = await cartesianQuality.getRainComputationQuality();

        // Verify same results
        expect(rainComputationQuality).eq(rainComputationQualityCached);
    });

    it('should get same CartesianQuality when translated', async () => {

        // Prepare scenario : full map with 4 gauges
        const scenario = getPreparedScenario(40, 42, CartesianQuality.DEFAULT_SCALE, -0.01, 4);

        // Compute the quality
        console.log(new Date().toISOString(), 'begin');
        const cartesianQuality = new CartesianQuality(scenario.cartesianRainHistories, scenario.cartesianGaugeHistories);
        const rainComputationQuality = await cartesianQuality.getRainComputationQuality();
        console.log(new Date().toISOString(), 'end');

        // Verify results
        expect(rainComputationQuality.quality).eq(42);
        expect(rainComputationQuality.maximums.rainMeasureValue).eq(90);
        expect(rainComputationQuality.maximums.gaugeMeasureValue).eq(48);

        expect(rainComputationQuality.qualitySpeedMatrix.getQualityPoints().length).eq(4);
        expect(rainComputationQuality.qualitySpeedMatrix.getQualityPoints()[0].gaugeId).eq('gauge0');
        expect(rainComputationQuality.qualitySpeedMatrix.getQualityPoints()[0].rainCartesianValue.value).eq(72);
        expect(rainComputationQuality.qualitySpeedMatrix.getQualityPoints()[0].rainCartesianValue.lat).eq(40);
        expect(rainComputationQuality.qualitySpeedMatrix.getQualityPoints()[0].rainCartesianValue.lng).eq(41.99);
        expect(rainComputationQuality.qualitySpeedMatrix.getQualityPoints()[0].gaugeCartesianValue.value).eq(30);
        expect(rainComputationQuality.qualitySpeedMatrix.getQualityPoints()[0].gaugeCartesianValue.lat).eq(40.01);
        expect(rainComputationQuality.qualitySpeedMatrix.getQualityPoints()[0].gaugeCartesianValue.lng).eq(41.99);
        expect(rainComputationQuality.qualitySpeedMatrix.getQualityPoints()[0].speed.x).eq(-0.01);
        expect(rainComputationQuality.qualitySpeedMatrix.getQualityPoints()[0].speed.y).eq(0);

        // Get the cached result
        const rainComputationQualityCached = await cartesianQuality.getRainComputationQuality();

        // Verify same results
        expect(rainComputationQuality).eq(rainComputationQualityCached);
    });

    // TODO it('should get same CartesianQuality when translated and scaled up', async () => {


});
