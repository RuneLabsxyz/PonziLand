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
  // {
  //   id: 'notifications',
  //   type: 'notifications',
  //   label: 'Notifications',
  //   icon: '/ui/icons/Icon_Thin_Notification.png',
  // },
];
