import {getRhumbLineBearing, getSpeed} from 'geolib';
import {QualityTools} from './QualityTools';

export class SpeedComparator {

    constructor(
        public deltaSum: number = 0,
        public distanceSum: number = 0,
        public xDiff: number = 0,
        public yDiff: number = 0,
        public speedMetersPerSec: number = 0,
        public angleDegrees: number = 0,
        public positionGeoRatio: number = 1
    ) {
    }

    public convertSpeed(positionRatio: number, timeInMilliSec: number) {

        if (timeInMilliSec === 0) {
            return;
        }

        this.angleDegrees = getRhumbLineBearing(
            {latitude: 0, longitude: 0},
            {latitude: this.xDiff * positionRatio, longitude: this.yDiff * positionRatio}
        );
        this.speedMetersPerSec = getSpeed(
            {latitude: 0, longitude: 0, time: 0},
            {latitude: this.xDiff * positionRatio, longitude: this.yDiff * positionRatio, time: timeInMilliSec}
        );
    }

    public getLatitudeDiff(): number {
        return QualityTools.roundLatLng(this.xDiff * this.positionGeoRatio);
    }

    public getLongitudeDiff(): number {
        return QualityTools.roundLatLng(this.yDiff * this.positionGeoRatio);
    }

    public getDistanceBetweenZero(): number {
        return Math.sqrt(Math.pow(this.xDiff, 2) + Math.pow(this.yDiff, 2));
    }


}