import {SpeedComparator} from '../../src';
import {expect} from 'chai';


describe('SpeedComparator', () => {


    it('should get default speed', () => {
        const speedComparator = new SpeedComparator();
        speedComparator.convertSpeed(10);
        expect(speedComparator.speedNormalized).eq(0);
        expect(speedComparator.angleDegrees).eq(0);
    });

    it('should get default speed if no time', () => {
        const speedComparator = new SpeedComparator(100, 10, 1000, 2000);
        speedComparator.convertSpeed(0);
        expect(speedComparator.speedNormalized).eq(0);
        expect(speedComparator.angleDegrees).eq(0);
    });

    it('should get default speed when consistent', () => {
        const speedComparator = new SpeedComparator(100, 10, 2000, 1000);
        expect(speedComparator.getAngleBetweenZero()).eq(26.56505117707799);
        expect(speedComparator.getDistanceBetweenZero()).eq(2236.06797749979);

        speedComparator.convertSpeed(10);
        expect(speedComparator.speedNormalized).eq(223.60679774997897);
        expect(speedComparator.angleDegrees).eq(26.56505117707799);
    });

});
