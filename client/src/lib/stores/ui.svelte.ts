import type { TileInfo, BuyData, AuctionData } from "$lib/interfaces";

let showModal = $state<boolean>(false);
let modalData = $state<TileInfo | null>(null);
let auctionData = $state<AuctionData | null>(null);

export function handleTileBuy(info: TileInfo) {
    modalData = info;
    showModal = true;
}

export function handleAuctionBuy(info: AuctionData) {
    auctionData = info;
    showModal = true;
}

export function handleCancel(): void {
    showModal = false;
    auctionData = null;
    modalData = null;
}

export function handleBuy(data: BuyData): void {
    console.log("Buying land with data:", data);
    // TODO: call buyTile function + front end sugar
    showModal = false;
}

export function getModalData() {
    return modalData;
}

export function getAuctionData() {
    return auctionData;
}

export function getShowModal() {
    return showModal;
}