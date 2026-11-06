import { Franchise, FranchiseId } from '../types/cricket';

export const IPL_FRANCHISES: Record<FranchiseId, Franchise> = {
  CSK: {
    id: 'CSK',
    name: 'Chennai Super Kings',
    shortName: 'Super Kings',
    primaryColor: '#FACC15', // Gold / Yellow
    secondaryColor: '#1E3A8A', // Deep Navy
    accentColor: '#F59E0B',
    textColor: '#0F172A',
    homeVenue: 'M.A. Chidambaram Stadium, Chepauk',
    city: 'Chennai',
    titles: 5,
    logoSymbol: '🦁',
    coachName: 'Stephen Fleming',
    aiBotName: 'Fleming AI',
    motto: 'Whistle Podu',
  },
  MI: {
    id: 'MI',
    name: 'Mumbai Indians',
    shortName: 'Indians',
    primaryColor: '#0284C7', // Royal Blue
    secondaryColor: '#D97706', // Gold
    accentColor: '#38BDF8',
    textColor: '#FFFFFF',
    homeVenue: 'Wankhede Stadium',
    city: 'Mumbai',
    titles: 5,
    logoSymbol: '⚡',
    coachName: 'Mark Boucher',
    aiBotName: 'Paltan AI',
    motto: 'Duniya Hila Denge',
  },
  RCB: {
    id: 'RCB',
    name: 'Royal Challengers Bengaluru',
    shortName: 'Challengers',
    primaryColor: '#DC2626', // Crimson Red
    secondaryColor: '#0F172A', // Royal Black / Navy
    accentColor: '#F59E0B', // Gold
    textColor: '#FFFFFF',
    homeVenue: 'M. Chinnaswamy Stadium',
    city: 'Bengaluru',
    titles: 0,
    logoSymbol: '👑',
    coachName: 'Andy Flower',
    aiBotName: 'Challenger AI',
    motto: 'Ee Sala Cup Namde',
  },
  KKR: {
    id: 'KKR',
    name: 'Kolkata Knight Riders',
    shortName: 'Knight Riders',
    primaryColor: '#581C87', // Royal Purple
    secondaryColor: '#EAB308', // Gold
    accentColor: '#A855F7',
    textColor: '#FFFFFF',
    homeVenue: 'Eden Gardens',
    city: 'Kolkata',
    titles: 3,
    logoSymbol: '⚔️',
    coachName: 'Chandrakant Pandit',
    aiBotName: 'Knight AI',
    motto: 'Korbo Lorbo Jeetbo',
  },
  SRH: {
    id: 'SRH',
    name: 'Sunrisers Hyderabad',
    shortName: 'Sunrisers',
    primaryColor: '#EA580C', // Fiery Orange
    secondaryColor: '#0F172A', // Black
    accentColor: '#FB923C',
    textColor: '#FFFFFF',
    homeVenue: 'Rajiv Gandhi Intl Cricket Stadium',
    city: 'Hyderabad',
    titles: 1,
    logoSymbol: '🦅',
    coachName: 'Daniel Vettori',
    aiBotName: 'Orange Army AI',
    motto: 'Play With Fire',
  },
  RR: {
    id: 'RR',
    name: 'Rajasthan Royals',
    shortName: 'Royals',
    primaryColor: '#EC4899', // Royal Pink
    secondaryColor: '#1E40AF', // Royal Blue
    accentColor: '#F472B6',
    textColor: '#FFFFFF',
    homeVenue: 'Sawai Mansingh Stadium',
    city: 'Jaipur',
    titles: 1,
    logoSymbol: '🏰',
    coachName: 'Rahul Dravid',
    aiBotName: 'Halla Bol AI',
    motto: 'Halla Bol',
  },
  DC: {
    id: 'DC',
    name: 'Delhi Capitals',
    shortName: 'Capitals',
    primaryColor: '#2563EB', // Blue
    secondaryColor: '#DC2626', // Red
    accentColor: '#60A5FA',
    textColor: '#FFFFFF',
    homeVenue: 'Arun Jaitley Stadium',
    city: 'Delhi',
    titles: 0,
    logoSymbol: '🐯',
    coachName: 'Hemang Badani',
    aiBotName: 'Roar AI',
    motto: 'Roar Macha',
  },
  PBKS: {
    id: 'PBKS',
    name: 'Punjab Kings',
    shortName: 'Kings',
    primaryColor: '#B91C1C', // Crimson
    secondaryColor: '#94A3B8', // Silver
    accentColor: '#EF4444',
    textColor: '#FFFFFF',
    homeVenue: 'Maharaja Yadavindra Singh Stadium, Mullanpur',
    city: 'Punjab',
    titles: 0,
    logoSymbol: '🛡️',
    coachName: 'Ricky Ponting',
    aiBotName: 'Sher AI',
    motto: 'Sadda Punjab',
  },
  GT: {
    id: 'GT',
    name: 'Gujarat Titans',
    shortName: 'Titans',
    primaryColor: '#0F172A', // Dark Navy
    secondaryColor: '#D97706', // Gold
    accentColor: '#0284C7', // Electric Blue
    textColor: '#FFFFFF',
    homeVenue: 'Narendra Modi Stadium',
    city: 'Ahmedabad',
    titles: 1,
    logoSymbol: '🔱',
    coachName: 'Ashish Nehra',
    aiBotName: 'Titan AI',
    motto: 'Aava De',
  },
  LSG: {
    id: 'LSG',
    name: 'Lucknow Super Giants',
    shortName: 'Super Giants',
    primaryColor: '#0369A1', // Cyan / Navy
    secondaryColor: '#F97316', // Orange
    accentColor: '#38BDF8',
    textColor: '#FFFFFF',
    homeVenue: 'BRSABV Ekana Stadium',
    city: 'Lucknow',
    titles: 0,
    logoSymbol: '🪽',
    coachName: 'Justin Langer',
    aiBotName: 'Adab AI',
    motto: 'Ab Apni Baari Hai',
  },
};

export const FRANCHISE_LIST = Object.values(IPL_FRANCHISES);
