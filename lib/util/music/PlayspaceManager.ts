import Playspace from "./Playspace";

export default class PlayspaceManager {
    spaces: Playspace[] = []
    current: Playspace

    constructor() {
        this.spaces.push(new Playspace({name: 'Default', isDefault: true, author: 'default'}));
        this.current = this.spaces[0];
    }

    static fromJSON(data: string | any) {
        if(typeof data == 'string')
            data = JSON.parse(data);

        let p = new PlayspaceManager();
        p.spaces = data.spaces.map((s: Playspace) => Playspace.fromJSON(s));
        p.current = p.spaces.find(p => p.name == data.current);
        return p;
    }

    toJSON() {
        let obj: any = Object.assign({}, this);
        obj.spaces = this.spaces.map((s: Playspace) => s.toJSON());
        obj.current = this.current.name;
        return obj;
    }
}