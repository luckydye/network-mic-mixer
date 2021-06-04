
let map = {};

export default class LabelMap {

    static getMap() {
        return map;
    }

    static setLabel(id, label) {
        map[id] = label;

    }

    static getLabel(id) {
        return map[id];
    }

    static storeMap() {
        localStorage.setItem('label-map', JSON.stringify(map));
    }

}

const storedMap = localStorage.getItem('label-map');
if(!storedMap) {
    LabelMap.storeMap();
} else {
    map = JSON.parse(storedMap);
}
