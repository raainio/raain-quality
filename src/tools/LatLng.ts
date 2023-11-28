import {QualityTools} from './QualityTools';

export class LatLng {
    constructor(
        public lat: number,
        public lng: number,
    ) {
    }

    public equals(v: LatLng) {
        return this.lat === v.lat && this.lng === v.lng;
    }

    setPrecision(precision: number = 12) {
        const tenPower = Math.pow(10, precision);
        this.lat = Math.round(this.lat * tenPower) / tenPower;
        this.lng = Math.round(this.lng * tenPower) / tenPower;
    }

    rounded(scale: LatLng) {
        this.lat = QualityTools.roundLatLng(this.lat, scale.lat, true);
        this.lng = QualityTools.roundLatLng(this.lng, scale.lng, true);
    }
}
