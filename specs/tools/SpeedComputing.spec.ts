import {PositionHistory, QualityTools, SpeedComputing} from '../../src';
import {expect} from 'chai';

describe('SpeedComputing', () => {

    function getPreparedScenario(minDate: Date,
                                 width = 50,
                                 translation = 0,
                                 gaugesCount = 1,
                                 periodCount = 6) {
        const possibleGaugePositions = [[-4, -5]];
        for (let i = 0; i < gaugesCount; i++) {
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
                            x, y, 5 + gaugeIndex * 0.1);
                    }

                    rainHistories.push(rainHistory);
                }
            }
        }
        return {rainHistories, gaugeHistories};
    }

    it('should get matrix with non valid values on empty history', () => {
        const speedComputing = new SpeedComputing([], []);
        const speedMatrix = speedComputing.computeSpeedMatrix(new Date());
        expect(speedMatrix).null;
    });

    it('should get matrix for five gauges', () => {

        // Prepare scenario : simple 10x10 map with 1 gauge == 1 rain
        const periodCount = 7;
        const scenario = getPreparedScenario(new Date('2000-01-01T01:00:00.000Z'), 10, 0, 5, periodCount);

        // Compute the speed
        const speedComputing = new SpeedComputing(scenario.rainHistories, scenario.gaugeHistories, 3, 1);
        const speedMatrix = speedComputing.computeSpeedMatrix(new Date('2000-01-01T01:35:00.000Z'),
            {periodCount, periodMinutes: 35});

        // Verify results
        // tslint:disable-next-line:max-line-length
        expect(speedMatrix.getGaugeIdRelatedValues(scenario.gaugeHistories[1].id).gaugeCartesianValue.value)
            .eq(scenario.gaugeHistories[1].value * periodCount);
        expect(speedMatrix.getGaugeIdRelatedValues(scenario.gaugeHistories[1].id).rainCartesianValue.value)
            .eq(35.7);
        expect(speedMatrix.getGaugeIdRelatedValues(scenario.gaugeHistories[1].id).speed.x).eq(0);
        expect(speedMatrix.getGaugeIdRelatedValues(scenario.gaugeHistories[1].id).speed.y).eq(0);

        expect(speedMatrix.getGaugeIdRelatedValues(scenario.gaugeHistories[4].id).gaugeCartesianValue.value)
            .eq(9 * periodCount);
        expect(speedMatrix.getGaugeIdRelatedValues(scenario.gaugeHistories[4].id).rainCartesianValue.value)
            .eq(37.8);
        expect(speedMatrix.getGaugeIdRelatedValues(scenario.gaugeHistories[4].id).speed.x).eq(0);
        expect(speedMatrix.getGaugeIdRelatedValues(scenario.gaugeHistories[4].id).speed.y).eq(0);
    });

    it('should get matrix speed for real images', () => {

        // Prepare scenario : simple 10x10 map with 1 gauge == 1 rain
        const periodCount = 7;
        const scenario = getPreparedScenario(new Date('2000-01-01T01:00:00.000Z'), 100, 5, 120, periodCount);

        // Compute the speed
        const speedComputing = new SpeedComputing(scenario.rainHistories, scenario.gaugeHistories, 8, 1);
        const speedMatrix = speedComputing.computeSpeedMatrix(
            new Date('2000-01-01T01:35:00.000Z'),
            {periodCount, periodMinutes: 35});

        // Verify results
        expect(speedMatrix.getGaugeIdRelatedValues(scenario.gaugeHistories[4].id).gaugeCartesianValue.value)
            .eq(9 * periodCount);
        expect(speedMatrix.getGaugeIdRelatedValues(scenario.gaugeHistories[4].id).rainCartesianValue.value)
            .eq(37.8);
        expect(speedMatrix.getGaugeIdRelatedValues(scenario.gaugeHistories[4].id).speed.x).eq(5);
        expect(speedMatrix.getGaugeIdRelatedValues(scenario.gaugeHistories[4].id).speed.y).eq(0);
    });
});
