import {Position, PositionHistory, QualityTools, SpeedComputing, SpeedMatrix, SpeedMatrixContainer} from '../../src';
import {expect} from 'chai';
import {CartesianValue, QualityPoint} from 'raain-model';

describe('SpeedComputing', () => {

    function getPreparedScenario(minDate: Date,
                                 width = 50,
                                 translation = 0,
                                 gaugesCount = 1,
                                 periodCount = 6) {
        const possibleGaugePositions = [[-4, -5]];
        for (let i = 1; i < gaugesCount; i++) {
            possibleGaugePositions.push([i * 2, i * 3]);
        }
        const rainHistories: PositionHistory[] = [];
        const gaugeHistories: PositionHistory[] = [];
        let count;

        for (let period = 0; period < periodCount; period++) {
            const measureRainDate = new Date(minDate.getTime() + period * 60000 * 5);
            const measureGaugeDate = new Date(minDate.getTime() + period * 60000 * 5 + 10000);

            count = 0;
            for (let x = -width; x <= width; x++) {
                for (let y = -width; y <= width; y++) {
                    const gaugeIndex = QualityTools.indexOfDualArray(possibleGaugePositions, [x, y]);
                    if (gaugeIndex >= 0) {
                        const gaugeHistory = new PositionHistory(
                            'gauge' + count++,
                            measureGaugeDate,
                            x, y, 5 + gaugeIndex);
                        gaugeHistories.push(gaugeHistory);
                    }
                }
            }

            count = 0;
            for (let x = -width; x <= width; x++) {
                for (let y = -width; y <= width; y++) {
                    count++;
                    let rainHistory = new PositionHistory(
                        'rain' + count,
                        measureRainDate,
                        x, y, 100);

                    const gaugeIndex = QualityTools.indexOfDualArray(possibleGaugePositions, [x - translation, y]);
                    if (gaugeIndex >= 0) {
                        rainHistory = new PositionHistory(
                            'rain' + count,
                            measureRainDate,
                            x, y, 5 + gaugeIndex * 0.99);
                    }

                    rainHistories.push(rainHistory);
                }
            }
        }
        return {rainHistories, gaugeHistories};
    }

    it('should get non trusted matrix with non valid values on empty history', () => {
        const speedComputing = new SpeedComputing([], []);
        const speedMatrix = speedComputing.computeSpeedMatrix(new Date());

        expect(speedMatrix.getTrustedIndicator()).eq(0.5);
        expect(speedMatrix.isConsistent()).eq(false);
    });

    it('should get matrix for five gauges', () => {

        // Prepare scenario : simple 10x10 map with 1 gauge == 1 rain
        const periodCount = 7;
        const scenario = getPreparedScenario(new Date('2000-01-01T01:00:00.000Z'), 20, 0, 5, periodCount);

        // Compute the speed
        const speedComputing = new SpeedComputing(scenario.rainHistories, scenario.gaugeHistories, 2, 1);
        const speedMatrix = speedComputing.computeSpeedMatrix(new Date('2000-01-01T01:30:00.000Z'),
            {periodCount, periodMinutes: 35});

        // Verify results
        expect(speedMatrix.getQualityPoints().length).eq(5);
        expect(speedMatrix.getMaxRain()).eq(8.96);
        expect(speedMatrix.getMaxGauge()).eq(9);

        const flatten = speedMatrix.renderFlatten();
        expect(flatten.length).eq(5 * 5);
        expect(flatten[0].x).eq(-2);
        expect(flatten[0].y).eq(-2);
        expect(flatten[0].value).eq(0);
        expect(flatten[12].x).eq(0);
        expect(flatten[12].y).eq(0);
        expect(flatten[12].value).eq(558.5755555555556);

        expect(speedMatrix.getGaugeIdRelatedValues(scenario.gaugeHistories[0].id).gaugeCartesianValue.value)
            .eq(scenario.gaugeHistories[0].value);
        expect(speedMatrix.getGaugeIdRelatedValues(scenario.gaugeHistories[0].id).rainCartesianValue.value)
            .eq(5);
        expect(speedMatrix.getGaugeIdRelatedValues(scenario.gaugeHistories[0].id).speed.x).eq(0);
        expect(speedMatrix.getGaugeIdRelatedValues(scenario.gaugeHistories[0].id).speed.y).eq(0);

        expect(speedMatrix.getGaugeIdRelatedValues(scenario.gaugeHistories[1].id).gaugeCartesianValue.value)
            .eq(scenario.gaugeHistories[1].value);
        expect(speedMatrix.getGaugeIdRelatedValues(scenario.gaugeHistories[1].id).rainCartesianValue.value)
            .eq(5.99);
        expect(speedMatrix.getGaugeIdRelatedValues(scenario.gaugeHistories[1].id).speed.x).eq(0);
        expect(speedMatrix.getGaugeIdRelatedValues(scenario.gaugeHistories[1].id).speed.y).eq(0);

        expect(speedMatrix.getTrustedIndicator()).eq(1);
        expect(speedMatrix.isConsistent()).eq(true);
    });

    it('should get matrix speed for big images', () => {

        const periodCount = 7;
        const scenario = getPreparedScenario(new Date('2000-01-01T01:00:00.000Z'), 100, 5, 120, periodCount);

        // Compute the speed
        const speedComputing = new SpeedComputing(scenario.rainHistories, scenario.gaugeHistories, 8, 1);
        const speedMatrix = speedComputing.computeSpeedMatrix(
            new Date('2000-01-01T01:30:00.000Z'),
            {periodCount, periodMinutes: 35});

        // Verify results
        expect(speedMatrix.getQualityPoints().length).eq(34);
        expect(speedMatrix.getMaxGauge()).eq(38);
        expect(speedMatrix.getMaxRain()).eq(37.67);

        expect(speedMatrix.getGaugeIdRelatedValues(scenario.gaugeHistories[4].id).gaugeCartesianValue.value)
            .eq(9);
        expect(speedMatrix.getGaugeIdRelatedValues(scenario.gaugeHistories[4].id).rainCartesianValue.value)
            .eq(8.96);
        expect(speedMatrix.getGaugeIdRelatedValues(scenario.gaugeHistories[4].id).speed.x).eq(5);
        expect(speedMatrix.getGaugeIdRelatedValues(scenario.gaugeHistories[4].id).speed.y).eq(0);

        expect(speedMatrix.getTrustedIndicator()).eq(0.8097278682212583);
        expect(speedMatrix.isConsistent()).eq(true);
    });

    it('should get several matrices and merge them using container', () => {

        const periodCount = 4; // each 5*4 = 20 min

        const matrices = [];
        for (let i = 0; i < 30; i++) {
            const start = new Date('2000-01-01T01:00:00.000Z');
            start.setMinutes(start.getMinutes() + i * 5);

            const scenario = getPreparedScenario(start, 100, 5, 20, periodCount);
            const speedComputing = new SpeedComputing(scenario.rainHistories, scenario.gaugeHistories, 8, 1);
            const speedMatrix = speedComputing.computeSpeedMatrix(
                new Date(start.getTime() + 15 * 60000),
                {periodCount, periodMinutes: 20});

            expect(speedMatrix.isConsistent()).eq(true);
            matrices.push(speedMatrix);
        }

        const speedMatrixContainer = new SpeedMatrixContainer(matrices);

        // Verify results
        expect(speedMatrixContainer.getQualityPoints().length).eq(20);
        expect(speedMatrixContainer.getMaxGauge()).eq(720);
        expect(speedMatrixContainer.getMaxRain()).eq(714.2999999999995);
        expect(speedMatrixContainer.getQuality()).eq(2.849999999999997);
        expect(speedMatrixContainer.getTrustedIndicators().length).eq(30);
        expect(speedMatrixContainer.getTrustedIndicators()[0]).eq(1);

        expect(speedMatrixContainer.getGaugeIdRelatedValues('gauge0').gaugeCartesianValue.value).eq(150);
        expect(speedMatrixContainer.getGaugeIdRelatedValues('gauge0').rainCartesianValue.value).eq(150);
        expect(speedMatrixContainer.getGaugeIdRelatedValues('gauge0').speed).eq(null);

        expect(JSON.stringify(speedMatrixContainer.toJSON())).contains('"qualityPoints":[');
        expect(JSON.stringify(speedMatrixContainer.toJSON())).contains('"trustedIndicators":[');

    }).timeout(20000);

    it('should manipulate containers', () => {

        const sameCenter = new Position(10, 20);
        const speedMatrices = [];
        speedMatrices.push(new SpeedMatrix([], sameCenter));
        speedMatrices.push(new SpeedMatrix([], sameCenter));
        const speedMatrixContainer = new SpeedMatrixContainer(speedMatrices);

        const speedMatrixContainerTwin = SpeedMatrixContainer.createFromJson(speedMatrixContainer.toJSON());

        expect(JSON.stringify(speedMatrixContainer.toJSON())).equal(JSON.stringify(speedMatrixContainerTwin.toJSON()));

        const speedMatrixContainerToMerge = SpeedMatrixContainer.createFromJson({
            qualityPoints: [new QualityPoint(
                'id', null, null,
                new CartesianValue(1, null, null),
                new CartesianValue(2, null, null),
                null)],
            trustedIndicator: 0.85,
            flattenMatrices: [],
        });
        speedMatrixContainer.merge(speedMatrixContainerToMerge);

        expect(JSON.stringify(speedMatrixContainer.toJSON({removeFlatten: true, removeIndicators: true})))
            .equal(JSON.stringify(speedMatrixContainerToMerge.toJSON({removeFlatten: true, removeIndicators: true})));

    });
});
