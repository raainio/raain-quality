export class LatLng {
    constructor(
        public lat: number,
        public lng: number,
    ) {
    }

    public equals(v: LatLng) {
        return this.lat === v.lat && this.lng === v.lng;
    }
}