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
    icon: '/ui/icons/Icon_MyLand.png',
  },
];
