export interface WhisperModel {
  id: string;
  label: string;
  desc: string;
  speed: number;
  accuracy: number;
  size: string;
  badge: string;
  badgeColor: string;
}

export const MODELS: WhisperModel[] = [
  {
    id: 'base',
    label: 'Base',
    desc: 'Good balance between speed and accuracy. Suitable for most use cases.',
    speed: 3, accuracy: 3, size: '145 MB',
    badge: 'Fastest', badgeColor: '#f59e0b',
  },
  {
    id: 'small',
    label: 'Small',
    desc: 'Higher accuracy, slightly slower processing. Good for complex content.',
    speed: 2, accuracy: 5, size: '466 MB',
    badge: 'Recommended', badgeColor: '#6366f1',
  },
  {
    id: 'medium',
    label: 'Medium',
    desc: 'Better accuracy, slower processing. Ideal for professional use cases.',
    speed: 1.5, accuracy: 5, size: '1.0 GB',
    badge: 'High Accuracy', badgeColor: '#3b82f6',
  },
  {
    id: 'large',
    label: 'Large',
    desc: 'Most accurate model, but slower processing. Best for high-quality transcriptions.',
    speed: 1, accuracy: 5, size: '1.4 GB',
    badge: 'Most Accurate', badgeColor: '#10b981',
  },
];
