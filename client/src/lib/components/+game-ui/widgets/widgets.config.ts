export interface Widget {
  id: string;
  type: string;
  label: string;
  icon: string;
}

export const availableWidgets: Widget[] = [
  {
    id: 'my-lands',
    type: 'my-lands',
    label: 'My Lands',
    icon: '/ui/icons/Icon_Thin_MyLand.png',
  },
  {
    id: 'auctions',
    type: 'auctions',
    label: 'Auctions',
    icon: '/ui/icons/Icon_Thin_Auction.png',
  },
  {
    id: 'help',
    type: 'help',
    label: 'Help',
    icon: '/ui/icons/Icon_Book.png',
  },
  {
    id: 'guild',
    type: 'guild',
    label: 'Guild',
    icon: '/ui/icons/Icon_Guilds.png',
  },
  {
    id: 'leaderboard',
    type: 'leaderboard',
    label: 'Leaderboard',
    icon: '/ui/icons/Icon_Cup.png',
  },
  // {
  //   id: 'notifications',
  //   type: 'notifications',
  //   label: 'Notifications',
  //   icon: '/ui/icons/Icon_Thin_Notification.png',
  // },
];
