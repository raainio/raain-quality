import {LatLng, QualityTools} from '../../src';
import {expect} from 'chai';


describe('QualityTools', () => {


    it('should get roundLatLng', () => {
        expect(QualityTools.roundLatLng(12.1234)).eq(12.120000000000001);
        expect(QualityTools.roundLatLng(12.1234, 0.005)).eq(12.125);
        expect(QualityTools.roundLatLng(12.1234, 0.001)).eq(12.123000000000001); // => needPrecision
        expect(QualityTools.roundLatLng(12.1234, 0.001, true)).eq(12.123);
        expect(QualityTools.roundLatLng(12.1234, 0.01, true)).eq(12.12);
        expect(QualityTools.roundLatLng(12.1234, 0.1, true)).eq(12.1);
        expect(QualityTools.roundLatLng(12.1234, 1)).eq(12);

        expect(QualityTools.roundLatLng(-2.8000000000000003, 0.1, true)).eq(-2.8);
        expect(QualityTools.roundLatLng(-2.8000000000000003, 0.002, true)).eq(-2.8);

        expect(QualityTools.roundLatLng(-23.8000000000000003, 10)).eq(-20);
        expect(QualityTools.roundLatLng(345.1200000000000003, 200)).eq(400);
    });

    it('should isAroundLatLng', () => {
        const center = new LatLng(12.3456, 1.234);

        expect(QualityTools.isAroundLatLng(center, new LatLng(12.3456, 1.234), 0)).eq(true);
        expect(QualityTools.isAroundLatLng(center, new LatLng(12.3457, 1.234), 0)).eq(true);
        expect(QualityTools.isAroundLatLng(center, new LatLng(12.0006, 1.234), 0)).eq(false);

        expect(QualityTools.isAroundLatLng(center, new LatLng(12.3456, 1.234), 0, 0.1)).eq(true);
        expect(QualityTools.isAroundLatLng(center, new LatLng(12.3556, 1.234), 0, 0.1)).eq(false);

        expect(QualityTools.isAroundLatLng(center, new LatLng(12.3456, 1.234), 1, 0.1)).eq(true);
        expect(QualityTools.isAroundLatLng(center, new LatLng(12.3457, 1.234), 1, 0.1)).eq(true);
        expect(QualityTools.isAroundLatLng(center, new LatLng(12.3457, 1.434), 1, 0.1)).eq(false);

        expect(QualityTools.isAroundLatLng(center, new LatLng(12.3456, 1.234), 6, 0.01)).eq(true);
        expect(QualityTools.isAroundLatLng(center, new LatLng(12.3456, 1.299), 6, 0.01)).eq(false);
    });

    it('should isNotAroundLatLng', () => {
        const center = new LatLng(12.3456, 1.234);

        expect(QualityTools.isNotAroundLatLng(center, new LatLng(12.3456, 1.234), 0)).eq(false);
        expect(QualityTools.isNotAroundLatLng(center, new LatLng(12.3457, 1.234), 0)).eq(false);
        expect(QualityTools.isNotAroundLatLng(center, new LatLng(12.0006, 1.234), 0)).eq(true);

        expect(QualityTools.isNotAroundLatLng(center, new LatLng(12.3456, 1.234), 0, 0.1)).eq(false);
        expect(QualityTools.isNotAroundLatLng(center, new LatLng(12.3556, 1.234), 0, 0.1)).eq(true);

        expect(QualityTools.isNotAroundLatLng(center, new LatLng(12.3456, 1.234), 1, 0.1)).eq(false);
        expect(QualityTools.isNotAroundLatLng(center, new LatLng(12.3457, 1.234), 1, 0.1)).eq(false);
        expect(QualityTools.isNotAroundLatLng(center, new LatLng(12.3457, 1.434), 1, 0.1)).eq(true);

        expect(QualityTools.isNotAroundLatLng(center, new LatLng(12.3456, 1.234), 6, 0.01)).eq(false);
        expect(QualityTools.isNotAroundLatLng(center, new LatLng(12.3456, 1.299), 6, 0.01)).eq(true);
    });

});
