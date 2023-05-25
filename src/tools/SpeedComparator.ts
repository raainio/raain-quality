import {QualityTools} from './QualityTools';

export class SpeedComparator {

    constructor(
        public deltaSum: number = 0,
        public distanceSum: number = 0,
        public xDiff: number = 0,
        public yDiff: number = 0
    ) {
    }

    public speedNormalized = 0;
    public angleDegrees = 0;

    public convertSpeed(time: number) {

        if (time === 0) {
            return;
        }

        this.speedNormalized = this.getDistanceBetweenZero() / time;
        this.angleDegrees = this.getAngleBetweenZero();
    }

    public getLatitudeDiff(positionGeoRatio): number {
        return QualityTools.roundLatLng(this.xDiff * positionGeoRatio, positionGeoRatio);
    }

    public getLongitudeDiff(positionGeoRatio): number {
        return QualityTools.roundLatLng(this.yDiff * positionGeoRatio, positionGeoRatio);
    }

    public getDistanceBetweenZero(): number {
        return Math.sqrt(Math.pow(this.xDiff, 2) + Math.pow(this.yDiff, 2));
    }

    public getAngleBetweenZero(): number {
        let angle = Math.atan2(this.yDiff, this.xDiff);
        angle = angle * 180 / Math.PI;
        return angle;
    }


}
