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
    relativeTime: number
    vehId: number|string
    delay: number
}

export interface ShortResponse {
    stopId: number|string
    stopCode: string
    stopDesc: string
    delay: () => Promise<SIPResponse>
}

export interface ZTMNews {
    data_wygenerowania: string
    komunikaty: {
        tytul: string
        tresc: string
        url: string
        data_rozpoczecia: string
        data_zakonczenia: string
    }[]
}