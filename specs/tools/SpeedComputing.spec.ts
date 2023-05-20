import {PositionHistory, QualityTools, SpeedComputing} from '../../src';
import {expect} from 'chai';


describe('SpeedComputing', () => {

    function getPreparedScenario(width = 50, translation = 0, gaugesCount = 1) {
        const minDate = new Date('2000-01-01');
        const possibleGaugePositions = [[-1, -1]];
        for (let i = 1; i < gaugesCount; i++) {
            possibleGaugePositions.push([i * 2, i * 3]);
        }
        const rainHistories = [];
        const gaugeHistories = [];
        let count = 0;
        for (let x = -width; x <= width; x++) {
            for (let y = -width; y <= width; y++) {
                count++;
                const measureDate = new Date(minDate.getTime() + x);
                const gaugeIndex = QualityTools.indexOfDualArray(possibleGaugePositions, [x, y]);
                if (gaugeIndex >= 0) {
                    const gaugeHistory = new PositionHistory(
                        'gauge' + count,
                        measureDate,
                        x, y, 5);
                    gaugeHistories.push(gaugeHistory);
                }
            }
        }

        count = 0;
        for (let x = -width; x <= width; x++) {
            for (let y = -width; y <= width; y++) {
                count++;
                const measureDate = new Date(minDate.getTime() + x);
                let rainHistory = new PositionHistory(
                    'rain' + count,
                    measureDate,
                    x, y, 100);

                const gaugeIndex = QualityTools.indexOfDualArray(possibleGaugePositions, [x - translation, y]);
                if (gaugeIndex >= 0) {
                    rainHistory = new PositionHistory(
                        'rain' + count,
                        measureDate,
                        x, y, 5);
                }

                rainHistories.push(rainHistory);
            }
        }
        return {rainHistories, gaugeHistories};
    }

    it('should get default speed', () => {
        const speedComputing = new SpeedComputing([], []);
        const speedComparator = speedComputing.computeSpeed();

        expect(speedComparator.deltaSum).eq(-1);
        expect(speedComparator.distanceSum).eq(-1);
        expect(speedComparator.xDiff).eq(0);
        expect(speedComparator.yDiff).eq(0);
        expect(speedComparator.positionGeoRatio).eq(1);
        expect(speedComparator.speedMetersPerSec).eq(0);
        expect(speedComparator.angleDegrees).eq(0);

    });

    it('should get speed(0,0) for one gauge', () => {

        // Prepare scenario : simple 10x10 map with 1 gauge == 1 rain
        const scenario = getPreparedScenario(10, 0);

        // Compute the speed
        const speedComputing = new SpeedComputing(scenario.rainHistories, scenario.gaugeHistories, 1, 4, 1);
        const speedComparator = speedComputing.computeSpeed();

        // Verify results
        expect(speedComparator.deltaSum).eq(0);
        expect(speedComparator.distanceSum).eq(0);
        expect(speedComparator.xDiff).eq(0);
        expect(speedComparator.yDiff).eq(0);
        expect(speedComparator.positionGeoRatio).eq(1);
        expect(speedComparator.speedMetersPerSec).eq(0);
        expect(speedComparator.angleDegrees).eq(0);

    });

    it('should get speed(3,0) for one gauge', () => {

        // Prepare scenario : 10x10 map with 1 translated (+3) gauge
        const scenario = getPreparedScenario(10, 3);

        // Compute the speed
        const speedComputing = new SpeedComputing(scenario.rainHistories, scenario.gaugeHistories, 1, 4, 1);
        const speedComparator = speedComputing.computeSpeed();

        // Verify results
        expect(speedComparator.deltaSum).eq(0);
        expect(speedComparator.distanceSum).eq(0);
        expect(speedComparator.xDiff).eq(3);
        expect(speedComparator.yDiff).eq(0);
        expect(speedComparator.positionGeoRatio).eq(1);
        expect(speedComparator.angleDegrees).eq(0);
        expect(speedComparator.speedMetersPerSec).eq(37106444.44444445);

    });

    it('should get speed(5,0) for 4 gauges', () => {

        // Prepare scenario : full map with 4 gauges
        const scenario = getPreparedScenario(100, 5, 4);

        // Compute the speed
        console.log(new Date().toISOString(), 'begin');
        const speedComputing = new SpeedComputing(scenario.rainHistories, scenario.gaugeHistories, 1, 8, 2);
        const speedComparator = speedComputing.computeSpeed();
        console.log(new Date().toISOString(), 'end');

        // Verify results
        expect(speedComparator.deltaSum).eq(0);
        expect(speedComparator.distanceSum).eq(0);
        expect(speedComparator.xDiff).eq(5);
        expect(speedComparator.yDiff).eq(0);
        expect(speedComparator.positionGeoRatio).eq(1);
        expect(speedComparator.angleDegrees).eq(0);
        expect(speedComparator.speedMetersPerSec).eq(5622191.919191919);

    });


    it('should get speed(5,0) (divided by ratio) for 4 gauges with a different distanceRatio', () => {

        // Prepare scenario : full map with 4 gauges
        const scenario = getPreparedScenario(100, 5, 4);

        // Compute the speed
        console.log(new Date().toISOString(), 'begin');
        const speedComputing = new SpeedComputing(scenario.rainHistories, scenario.gaugeHistories, 0.1, 8, 2);
        const speedComparator = speedComputing.computeSpeed();
        console.log(new Date().toISOString(), 'end');

        // Verify results
        expect(speedComparator.deltaSum).eq(0);
        expect(speedComparator.distanceSum).eq(0);
        expect(speedComparator.xDiff).eq(5);
        expect(speedComparator.yDiff).eq(0);
        expect(speedComparator.positionGeoRatio).eq(0.1);
        expect(speedComparator.angleDegrees).eq(0);
        expect(speedComparator.speedMetersPerSec).eq(562222.2222222221);

    });

});
