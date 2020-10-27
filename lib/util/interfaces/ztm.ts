export interface SIPResponse {
    numerTras: string|number
    stopNumer: string
    stopName: string
    estimates: SIPDelay[]
}

export interface SIPDelay {
    routeId: string|number
    headsign: string
    estTime: string
    vehId: number|string
    delay: number
}

export interface ShortResponse {
    stopId: number|string
    stopCode: string
    stopDesc: string
    delay: () => Promise<SIPResponse>
}