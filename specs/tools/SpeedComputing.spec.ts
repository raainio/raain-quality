import {
    CartesianQuality,
    LatLng,
    Position,
    PositionHistory,
    QualityTools,
    SpeedComputing,
    SpeedMatrix,
    SpeedMatrixContainer
} from '../../src';
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
        let count = 0;

        for (let period = 0; period < periodCount; period++) {
            const measureRainDate = new Date(minDate.getTime() + period * 60000 * 5);
            const measureGaugeDate = new Date(minDate.getTime() + period * 60000 * 5 + 10000);

            count = 0;
            for (let x = -width; x <= width; x++) {
                for (let y = -width; y <= width; y++) {
                    const gaugeIndex = QualityTools.indexOfDualArray(possibleGaugePositions, [x, y]);
                    if (gaugeIndex >= 0) {
                        const value = (5 + gaugeIndex) / 12;
                        const gaugeHistory = new PositionHistory(
                            'gauge' + count++,
                            measureGaugeDate,
                            x * CartesianQuality.DEFAULT_SCALE * 1.001, y * CartesianQuality.DEFAULT_SCALE * 1.001,
                            value);
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
                        x * CartesianQuality.DEFAULT_SCALE, y * CartesianQuality.DEFAULT_SCALE,
                        100);

                    const gaugeIndex = QualityTools.indexOfDualArray(possibleGaugePositions, [x - translation, y]);
                    if (gaugeIndex >= 0) {
                        const value = 5 + gaugeIndex * 0.99;
                        rainHistory = new PositionHistory(
                            'rain' + count,
                            measureRainDate,
                            x * CartesianQuality.DEFAULT_SCALE, y * CartesianQuality.DEFAULT_SCALE,
                            value);
                    }

                    rainHistories.push(rainHistory);
                }
            }
        }
        return {rainHistories, gaugeHistories};
    }

    function getPreparedScenarioWeight(minDate: Date) {
        const width = 20;
        const gaugePositions = [[-4, -5], [-2, -7], [2, 2]];
        const gaugeValues = [2, 10, 12];
        const rainRelativePositions = [[1, 2], [1, 3], [-8, 3]];
        const rainXDiffusion = [1, 3, 16];
        const periodCount = 4;
        const periodStepInMn = 5;

        const rainHistories: PositionHistory[] = [];
        const gaugeHistories: PositionHistory[] = [];
        let count = 0;

        for (let period = 0; period < periodCount; period++) {
            const measureRainDate = new Date(minDate.getTime() + period * 60000 * periodStepInMn);
            const measureGaugeDate = new Date(minDate.getTime() + period * 60000 * periodStepInMn + 10000);

            count = 0;
            for (let x = -width; x <= width; x++) {
                for (let y = -width; y <= width; y++) {
                    const gaugeIndex = QualityTools.indexOfDualArray(gaugePositions, [x, y]);
                    if (gaugeIndex >= 0) {
                        const gaugeHistory = new PositionHistory(
                            'gauge' + count++,
                            measureGaugeDate,
                            x * CartesianQuality.DEFAULT_SCALE * 1.001, y * CartesianQuality.DEFAULT_SCALE * 1.001,
                            gaugeValues[gaugeIndex]);
                        gaugeHistories.push(gaugeHistory);
                    }
                }
            }

            count = 0;
            for (let x = -width; x <= width; x++) {
                for (let y = -width; y <= width; y++) {
                    count++;
                    const rainHistory = new PositionHistory(
                        'rain' + count, measureRainDate,
                        x * CartesianQuality.DEFAULT_SCALE, y * CartesianQuality.DEFAULT_SCALE,
                        0);
                    rainHistories.push(rainHistory);
                }
            }

            count = 0;
            for (let x = -width; x <= width; x++) {
                for (let y = -width; y <= width; y++) {
                    count++;
                    const gaugeIndex = QualityTools.indexOfDualArray(gaugePositions, [x, y]);
                    if (gaugeIndex >= 0) {
                        const position = rainRelativePositions[gaugeIndex];
                        const diffusion = rainXDiffusion[gaugeIndex];

                        for (let i = 0; i < diffusion; i++) {
                            const founds = rainHistories.filter(rh =>
                                rh.x / CartesianQuality.DEFAULT_SCALE === x + position[0] + i
                                && rh.y / CartesianQuality.DEFAULT_SCALE === y + position[1]
                                && rh.date.getTime() === measureRainDate.getTime());

                            if (founds.length) {
                                const pixelToChange = founds[0];
                                const gaugeValue = gaugeValues[gaugeIndex];
                                const rainValue = (gaugeValue + 0.001 * diffusion) * 12;
                                pixelToChange.valueFromGauge = gaugeValue;
                                pixelToChange.value = rainValue;
                                pixelToChange.valueFromRain = rainValue;
                            }
                        }
                    }
                }
            }
        }
        return {rainHistories, gaugeHistories};
    }

    it('should IsIn', () => {
        let gaugePosition = new Position(0.02, 0.03);
        const roundScale = new Position(0.00898, 0.01426);

        expect(SpeedComputing.IsIn({x: 0, y: 0}, gaugePosition, 10, roundScale)).eq(true);
        expect(SpeedComputing.IsIn({x: 2, y: 0}, gaugePosition, 10, roundScale)).eq(false);

        gaugePosition = new Position(2.22704, 48.9118);
        const rainPosition = new Position(2.26296, 48.86902);
        expect(SpeedComputing.IsIn(rainPosition, gaugePosition, 8, roundScale)).eq(true);
        expect(SpeedComputing.IsIn(gaugePosition, rainPosition, 8, roundScale)).eq(true);
    });

    it('should IsInThePath', () => {
        const p1 = new Position(0.02, 0.03);
        const p2 = new Position(0.001, 0.002);
        const roundScale = new Position(0.00898, 0.01426);

        expect(SpeedComputing.IsInThePath(p1, p1, p2, roundScale)).eq(true);
        expect(SpeedComputing.IsInThePath(p2, p1, p2, roundScale)).eq(true);
        expect(SpeedComputing.IsInThePath(new Position(2, 0), p1, p2, roundScale)).eq(false);
        expect(SpeedComputing.IsInThePath(new Position(0.01, 0.015), p1, p2, roundScale)).eq(true);
        expect(SpeedComputing.IsInThePath(new Position(0.01, 0.001), p1, p2, roundScale)).eq(false);
    });

    it('should ComputeRelatedSolutions', () => {
        const roundScale = new Position(CartesianQuality.DEFAULT_SCALE, CartesianQuality.DEFAULT_SCALE);
        const rangeGaugeLarge = SpeedMatrix.DEFAULT_MATRIX_RANGE;
        const gaugeHistory = new PositionHistory('gid', new Date(), 1, 1, 10);
        const rainHistory1 = new PositionHistory('rid1', new Date(), 1.01, 1.01, 10.2);
        const rainHistory2 = new PositionHistory('rid2', new Date(), 1.02, 1.02, 10.04);
        const rainHistory3 = new PositionHistory('rid3', new Date(), 1.03, 1.03, 5.01);
        const rainHistory4 = new PositionHistory('rid4', new Date(), 1.04, 1.04, 2.02);
        const rainHistory5 = new PositionHistory('rid5', new Date(), 1.04, 1.05, 3.00);

        let relatedSolutions = SpeedComputing.ComputeRelatedSolutions(gaugeHistory,
            [], rangeGaugeLarge, roundScale);
        expect(relatedSolutions.length).eq(0);

        relatedSolutions = SpeedComputing.ComputeRelatedSolutions(gaugeHistory,
            [rainHistory1, rainHistory2, rainHistory3, rainHistory4, rainHistory5],
            rangeGaugeLarge, roundScale);
        expect(relatedSolutions.length).eq(28);
        expect(relatedSolutions[0].weightValue).eq(0.9960159362549802);
        expect(relatedSolutions[0].positions.length).eq(1);
        expect(relatedSolutions[0].positions[0].id).eq('rid2');

        // expect(relatedSolutions[0].positions.length).eq(3);
        // expect(relatedSolutions[0].positions[0].id).eq('rid3');
        // expect(relatedSolutions[0].positions[1].id).eq('rid4');
        // expect(relatedSolutions[0].positions[2].id).eq('rid5');
        // expect(relatedSolutions[8].weightValue).eq(0.9960159362549802);
        // expect(relatedSolutions[8].positions.length).eq(1);
        // expect(relatedSolutions[8].positions[0].id).eq('rid2');
        // expect(relatedSolutions[21].weightValue).eq(0.9803921568627452);
        // expect(relatedSolutions[21].positions.length).eq(1);
        // expect(relatedSolutions[21].positions[0].id).eq('rid1');
    });

    it('should ComputeLinkedPositionHistories V2', () => {
        let linkedPositionHistories: PositionHistory[];
        const roundScale = new Position(CartesianQuality.DEFAULT_SCALE, CartesianQuality.DEFAULT_SCALE);
        const rangeGaugeLarge = SpeedMatrix.DEFAULT_MATRIX_RANGE;

        linkedPositionHistories = SpeedComputing.ComputeLinkedPositionHistories([], [], rangeGaugeLarge, roundScale);
        expect(linkedPositionHistories.length).eq(0);

        const gaugeHistoryInThePeriod = [new PositionHistory('gid', new Date('2023-01-01'), 1, 1, 10)];
        let rainHistoryInThePeriod = [new PositionHistory('rid', new Date('2023-01-01'), 1.03, 1.04, 10.05)];
        linkedPositionHistories = SpeedComputing.ComputeLinkedPositionHistories(gaugeHistoryInThePeriod, rainHistoryInThePeriod,
            rangeGaugeLarge, roundScale,);
        expect(linkedPositionHistories.length).eq(1);
        expect(linkedPositionHistories[0].value).eq(0.9950248756218905);
        expect(linkedPositionHistories[0].valueFromGauge).eq(0.8333333333333334);
        expect(linkedPositionHistories[0].valueFromRain).eq(10.05);

        rainHistoryInThePeriod = [
            new PositionHistory('rid1', new Date('2023-01-01'), 1.03, 1.04, 10.05),
            new PositionHistory('rid2', new Date('2023-01-01'), 0.98, 1, 5.02),
            new PositionHistory('rid3', new Date('2023-01-01'), 0.97, 1, 5.01),
        ];
        linkedPositionHistories = SpeedComputing.ComputeLinkedPositionHistories(gaugeHistoryInThePeriod, rainHistoryInThePeriod,
            rangeGaugeLarge, roundScale,);
        expect(linkedPositionHistories.length).eq(1);
        expect(linkedPositionHistories[0].value).eq(0.9950248756218905);
    });

    it('should ComputeLinkedPositionHistories V1', () => {
        let linkedPositionHistories: PositionHistory[];
        const roundScale = new Position(CartesianQuality.DEFAULT_SCALE, CartesianQuality.DEFAULT_SCALE);
        const rangeGaugeLarge = SpeedMatrix.DEFAULT_MATRIX_RANGE;

        linkedPositionHistories = SpeedComputing.ComputeLinkedPositionHistoriesV1([], [], rangeGaugeLarge, roundScale,);
        expect(linkedPositionHistories.length).eq(0);

        const gaugeHistoryInThePeriod = [new PositionHistory('gid', new Date('2023-01-01'), 1, 1, 10)];
        let rainHistoryInThePeriod = [new PositionHistory('rid', new Date('2023-01-01'), 1.03, 1.04, 10.05)];
        linkedPositionHistories = SpeedComputing.ComputeLinkedPositionHistoriesV1(gaugeHistoryInThePeriod, rainHistoryInThePeriod,
            rangeGaugeLarge, roundScale);
        expect(linkedPositionHistories.length).eq(1);
        expect(linkedPositionHistories[0].value).eq(1);
        expect(linkedPositionHistories[0].valueFromGauge).eq(0.8333333333333334);
        expect(linkedPositionHistories[0].valueFromRain).eq(10.05);

        rainHistoryInThePeriod = [
            new PositionHistory('rid', new Date('2023-01-01'), 1.03, 1.04, 10.05),
            new PositionHistory('rid', new Date('2023-01-01'), 0.98, 1, 5.02),
            new PositionHistory('rid', new Date('2023-01-01'), 0.97, 1, 5.01),
        ];
        linkedPositionHistories = SpeedComputing.ComputeLinkedPositionHistoriesV1(gaugeHistoryInThePeriod, rainHistoryInThePeriod,
            rangeGaugeLarge, roundScale);
        expect(linkedPositionHistories.length).eq(1);
        expect(linkedPositionHistories[0].valueFromRain).eq(10.05);
    });

    it('should get non trusted matrix with non valid values on empty history', () => {
        const speedComputing = new SpeedComputing([], []);
        const speedMatrix = speedComputing.computeSpeedMatrix(new Date());

        speedMatrix.logFlatten();
        expect(speedMatrix.getTrustedTechnicalIndicator()).eq(1);
        expect(speedMatrix.isConsistent()).eq(true);
    });

    it('should get matrix for five gauges', () => {

        // Prepare scenario : simple 10x10 map with each gauge == rain
        const periodCount = 7;
        const roundScale = new LatLng(0.01, 0.01);
        const scenario = getPreparedScenario(new Date('2000-01-01T01:00:00.000Z'), 20, 0, 5, periodCount);

        // Compute the speed
        const speedComputing = new SpeedComputing(scenario.rainHistories, scenario.gaugeHistories, 2, roundScale);
        const speedMatrix = speedComputing.computeSpeedMatrix(new Date('2000-01-01T01:30:00.000Z'),
            {periodCount, periodMinutes: 35});

        // Verify results
        expect(speedMatrix.getQualityPoints().length).eq(5);
        expect(speedMatrix.getMaxRain()).eq(8.96);
        expect(speedMatrix.getMaxGauge()).eq(9);

        const flatten = speedMatrix.renderFlatten();
        speedMatrix.logFlatten();
        expect(flatten.length).eq(5 * 5);
        expect(flatten[0].x).eq(-2);
        expect(flatten[0].y).eq(-2);
        expect(flatten[0].value).eq(0);
        expect(flatten[12].x).eq(0);
        expect(flatten[12].y).eq(0);
        expect(flatten[12].value).eq(1);

        expect(speedMatrix.getGaugeIdRelatedValues(scenario.gaugeHistories[0].id).gaugeCartesianValue.value)
            .eq(scenario.gaugeHistories[0].value * 12);
        expect(speedMatrix.getGaugeIdRelatedValues(scenario.gaugeHistories[0].id).rainCartesianValue.value)
            .eq(5);
        expect(speedMatrix.getGaugeIdRelatedValues(scenario.gaugeHistories[0].id).speed.x).eq(0);
        expect(speedMatrix.getGaugeIdRelatedValues(scenario.gaugeHistories[0].id).speed.y).eq(0);

        expect(speedMatrix.getGaugeIdRelatedValues(scenario.gaugeHistories[1].id).gaugeCartesianValue.value)
            .eq(scenario.gaugeHistories[1].value * 12);
        expect(speedMatrix.getGaugeIdRelatedValues(scenario.gaugeHistories[1].id).rainCartesianValue.value)
            .eq(5.99);
        expect(speedMatrix.getGaugeIdRelatedValues(scenario.gaugeHistories[1].id).speed.x).eq(0);
        expect(speedMatrix.getGaugeIdRelatedValues(scenario.gaugeHistories[1].id).speed.y).eq(0);

        expect(speedMatrix.getTrustedTechnicalIndicator()).eq(1);
        expect(speedMatrix.isConsistent()).eq(true);
    });

    it('should get matrix for 3 gauges and different weight', () => {

        const roundScale = new LatLng(0.01, 0.01);
        const scenario = getPreparedScenarioWeight(new Date('2000-01-01T01:00:00.000Z'));

        // Compute the speed
        const speedComputing = new SpeedComputing(scenario.rainHistories, scenario.gaugeHistories, 8, roundScale);
        const speedMatrix = speedComputing.computeSpeedMatrix(new Date('2000-01-01T01:15:00.000Z'),
            {periodCount: 3, periodMinutes: 15});

        // Verify results
        speedMatrix.logFlatten();
        expect(speedMatrix.getQualityPoints().length).eq(3);
        expect(speedMatrix.getMaxRain()).eq(144.192);
        expect(speedMatrix.getMaxGauge()).eq(144);
        expect(speedMatrix.isConsistent()).eq(true);

        const flatten = speedMatrix.renderFlatten();
        expect(flatten.length).eq(17 * 17);
        expect(flatten[0].x).eq(-8);
        expect(flatten[0].y).eq(-8);
        expect(flatten[0].value).eq(0);
        // expect(flatten[12].x).eq(0);
        // expect(flatten[12].y).eq(0);
        // expect(flatten[12].value).eq(558.5755555555556);
    });

    it('should get matrix speed for big images', () => {

        const periodCount = 7;
        const roundScale = new LatLng(0.01, 0.01);
        const scenario = getPreparedScenario(new Date('2000-01-01T01:00:00.000Z'), 100, 5, 120, periodCount);

        // Compute the speed
        const speedComputing = new SpeedComputing(scenario.rainHistories, scenario.gaugeHistories, 8, roundScale);
        const speedMatrix = speedComputing.computeSpeedMatrix(
            new Date('2000-01-01T01:30:00.000Z'),
            {periodCount, periodMinutes: 35});

        // Verify results
        console.log('verify:');
        speedMatrix.logFlatten();
        expect(speedMatrix.getQualityPoints().length).eq(34);
        expect(speedMatrix.getMaxGauge()).eq(38);
        expect(speedMatrix.getMaxRain()).eq(37.67);

        expect(speedMatrix.getGaugeIdRelatedValues(scenario.gaugeHistories[4].id).gaugeCartesianValue.value)
            .eq(9);
        expect(speedMatrix.getGaugeIdRelatedValues(scenario.gaugeHistories[4].id).rainCartesianValue.value)
            .eq(8.96);
        expect(speedMatrix.getGaugeIdRelatedValues(scenario.gaugeHistories[4].id).speed.x).eq(0.05);
        expect(speedMatrix.getGaugeIdRelatedValues(scenario.gaugeHistories[4].id).speed.y).eq(0);

        expect(speedMatrix.getTrustedTechnicalIndicator()).eq(1);
        expect(speedMatrix.isConsistent()).eq(true);
    }).timeout(1000000);

    it('should get several matrices and merge them using container', () => {

        const periodCount = 4; // each 5*4 = 20 min
        const roundScale = new LatLng(0.01, 0.01);

        const matrices = [];
        for (let i = 0; i < 30; i++) {
            const start = new Date('2000-01-01T01:00:00.000Z');
            start.setMinutes(start.getMinutes() + i * 5);

            const scenario = getPreparedScenario(start, 100, 5, 20, periodCount);
            const speedComputing = new SpeedComputing(scenario.rainHistories, scenario.gaugeHistories, 8, roundScale);
            const speedMatrix = speedComputing.computeSpeedMatrix(
                new Date(start.getTime() + 15 * 60000),
                {periodCount, periodMinutes: 20});

            expect(speedMatrix.isConsistent()).eq(true);
            matrices.push(speedMatrix);
        }

        const speedMatrixContainer = new SpeedMatrixContainer(matrices);

        // Verify results
        speedMatrixContainer.getMatrix().logFlatten();
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

        const speedMatrixContainerTwin = SpeedMatrixContainer.CreateFromJson(speedMatrixContainer.toJSON());

        expect(JSON.stringify(speedMatrixContainer.toJSON())).equal(JSON.stringify(speedMatrixContainerTwin.toJSON()));

        const speedMatrixContainerToMerge = SpeedMatrixContainer.CreateFromJson({
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
