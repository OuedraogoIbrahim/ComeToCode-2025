import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Voice from '@react-native-voice/voice';
import * as Speech from 'expo-speech';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Linking,
  Modal, PermissionsAndroid, Platform, RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

type Conseil = {
  id: string;
  category: 'nutrition' | 'activite' | 'education' | 'prevention';
  disease: Disease;
  title: string;
  description: string;
  points: number;
  isFavorite?: boolean;
  dateAdded?: string;
  tips?: string[];
  relatedLinks?: string[];
};

type Quiz = {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  disease: Disease;
  explanation: string;
  points: number;
  timeLimit?: number;
};

type Disease = 
  | 'diabete'
  | 'hypertension'
  | 'insuffisance-cardiaque'
  | 'atherosclerose'
  | 'maladie-coronarienne'
  | 'asthme'
  | 'bpco'
  | 'fibrose-pulmonaire'
  | 'hypothyroidie'
  | 'hyperthyroidie'
  | 'obesite'
  | 'insuffisance-renale'
  | 'nephropathie-diabetique'
  | 'parkinson'
  | 'sclerose-en-plaques'
  | 'epilepsie'
  | 'migraine-chronique'
  | 'lupus'
  | 'polyarthrite-rhumatoide'
  | 'crohn'
  | 'colite-ulcereuse'
  | 'cancer-sein'
  | 'cancer-prostate'
  | 'cancer-poumon'
  | 'leucemie'
  | 'arthrose'
  | 'osteoporose'
  | 'fibromyalgie'
  | 'depression'
  | 'troubles-anxieux'
  | 'schizophrenie'
  | 'trouble-bipolaire'
  | 'cirrhose'
  | 'psoriasis'
  | 'endometriose'
  | 'vih'
  | 'general';

type Badge = {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  unlocked: boolean;
  requiredPoints: number;
  dateUnlocked?: string;
  category?: string;
};

type UserProgress = {
  streak: number;
  lastVisit: string;
  completedToday: number;
  weeklyGoal: number;
  monthlyStats: { [key: string]: number };
};

type Challenge = {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  reward: number;
  deadline: string;
  type: 'daily' | 'weekly' | 'monthly';
};

const speak = (text: string, language: string = 'fr-FR') => {
  Speech.speak(text, { language, pitch: 1.0, rate: 0.9 });
};

const { width } = Dimensions.get('window');

export default function ConseilsSante() {
  const [activeTab, setActiveTab] = useState<'conseils' | 'quiz' | 'badges' | 'progress' | 'challenges'>('conseils');
  const [userPoints, setUserPoints] = useState(0);
  const [completedQuizzes, setCompletedQuizzes] = useState<string[]>([]);
  const [favoriteConseils, setFavoriteConseils] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<Disease | 'all'>('all');
  const [fadeAnim] = useState(new Animated.Value(1));
  const [tabAnim] = useState(new Animated.Value(0));
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedConseil, setSelectedConseil] = useState<Conseil | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pageConseils, setPageConseils] = useState(1);
  const [pageQuizzes, setPageQuizzes] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const itemsPerPage = 10;

  const [userProgress, setUserProgress] = useState<UserProgress>({
    streak: 0,
    lastVisit: new Date().toDateString(),
    completedToday: 0,
    weeklyGoal: 5,
    monthlyStats: {},
  });

  const [challenges, setChallenges] = useState<Challenge[]>([
    {
      id: 'daily1',
      title: '🎯 Quiz Quotidien',
      description: 'Complétez 3 quiz aujourd\'hui',
      target: 3,
      current: 0,
      reward: 25,
      deadline: new Date().toDateString(),
      type: 'daily',
    },
    {
      id: 'weekly1',
      title: '📚 Explorateur Santé',
      description: 'Lisez 10 conseils cette semaine',
      target: 10,
      current: 0,
      reward: 50,
      deadline: getWeekEnd(),
      type: 'weekly',
    },
    {
      id: 'monthly1',
      title: '🏆 Maître de la Santé',
      description: 'Gagnez 200 points ce mois-ci',
      target: 200,
      current: 0,
      reward: 100,
      deadline: getMonthEnd(),
      type: 'monthly',
    },
  ]);

  const [conseils, setConseils] = useState<Conseil[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);

  const [badges, setBadges] = useState<Badge[]>([
    {
      id: 'debutant',
      name: '🌱 Débutant Santé',
      description: 'Premiers pas vers une meilleure santé',
      icon: 'eco',
      color: '#4CAF50',
      unlocked: false,
      requiredPoints: 25,
      category: 'progression',
    },
    {
      id: 'nutritionniste',
      name: '🥗 Expert Nutrition',
      description: 'Maîtrise des conseils nutritionnels',
      icon: 'restaurant',
      color: '#FF9800',
      unlocked: false,
      requiredPoints: 50,
      category: 'expertise',
    },
    {
      id: 'sportif',
      name: '🏃‍♂️ Actif au Quotidien',
      description: 'Champion de l\'activité physique',
      icon: 'directions-run',
      color: '#2196F3',
      unlocked: false,
      requiredPoints: 75,
      category: 'activite',
    },
    {
      id: 'savant',
      name: '🎓 Sage de la Santé',
      description: 'Connaissance approfondie des maladies',
      icon: 'school',
      color: '#9C27B0',
      unlocked: false,
      requiredPoints: 100,
      category: 'expertise',
    },
    {
      id: 'champion',
      name: '🏆 Champion Yafa',
      description: 'Maître de la santé communautaire',
      icon: 'emoji-events',
      color: '#FFD700',
      unlocked: false,
      requiredPoints: 150,
      category: 'elite',
    },
    {
      id: 'assidu',
      name: '📅 Visiteur Assidu',
      description: 'Connecté 7 jours consécutifs',
      icon: 'event',
      color: '#FF5722',
      unlocked: false,
      requiredPoints: 0,
      category: 'regularite',
    },
    {
      id: 'quizmaster',
      name: '🧠 Maître Quiz',
      description: '10 quiz réussis',
      icon: 'psychology',
      color: '#E91E63',
      unlocked: false,
      requiredPoints: 0,
      category: 'performance',
    },
    {
      id: 'partageur',
      name: '📢 Ambassadeur Santé',
      description: 'Partagé 5 conseils avec des amis',
      icon: 'share',
      color: '#00BCD4',
      unlocked: false,
      requiredPoints: 0,
      category: 'social',
    },
  ]);

  const fetchConseils = async (page: number): Promise<Conseil[]> => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const conseilPool: Conseil[] = [
        // Diabète
        {
          id: `conseil-${Date.now()}-${page}-1`,
          category: 'nutrition',
          disease: 'diabete',
          title: '🥑 Avocats pour le diabète',
          description: 'Les avocats sont riches en graisses saines et aident à stabiliser la glycémie.',
          points: 10,
          tips: ['Consommez un demi-avocat par jour', 'Ajoutez-le à vos salades', 'Évitez les sauces sucrées'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.sante.fr/nutrition'],
        },
        {
          id: `conseil-${Date.now()}-${page}-2`,
          category: 'activite',
          disease: 'diabete',
          title: '🚶 Marche régulière pour le diabète',
          description: 'La marche aide à améliorer la sensibilité à l’insuline et à contrôler la glycémie.',
          points: 10,
          tips: ['Marchez 30 minutes par jour', 'Portez des chaussures confortables', 'Surveillez votre glycémie après l’effort'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.who.int/fr'],
        },
        // Hypertension
        {
          id: `conseil-${Date.now()}-${page}-3`,
          category: 'activite',
          disease: 'hypertension',
          title: '🚴‍♀️ Vélo pour la tension',
          description: 'Le vélo régulier réduit la pression artérielle et améliore la santé cardiaque.',
          points: 15,
          tips: ['Faites 30 minutes 3 fois par semaine', 'Choisissez un terrain plat', 'Portez un casque'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.who.int/fr'],
        },
        {
          id: `conseil-${Date.now()}-${page}-4`,
          category: 'nutrition',
          disease: 'hypertension',
          title: '🥗 Réduire le sel pour la tension',
          description: 'Une faible consommation de sel aide à maintenir une pression artérielle saine.',
          points: 10,
          tips: ['Évitez les aliments transformés', 'Utilisez des herbes pour assaisonner', 'Lisez les étiquettes alimentaires'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.santepubliquefrance.fr'],
        },
        // Insuffisance cardiaque
        {
          id: `conseil-${Date.now()}-${page}-5`,
          category: 'prevention',
          disease: 'insuffisance-cardiaque',
          title: '🩺 Suivi médical régulier',
          description: 'Un suivi régulier avec un cardiologue aide à gérer l’insuffisance cardiaque.',
          points: 10,
          tips: ['Prenez vos médicaments comme prescrit', 'Surveillez votre poids quotidiennement', 'Signalez tout symptôme nouveau'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.who.int/fr'],
        },
        {
          id: `conseil-${Date.now()}-${page}-6`,
          category: 'nutrition',
          disease: 'insuffisance-cardiaque',
          title: '🍎 Alimentation pauvre en sodium',
          description: 'Réduire le sodium aide à éviter la rétention d’eau dans l’insuffisance cardiaque.',
          points: 10,
          tips: ['Préférez les aliments frais', 'Évitez les conserves', 'Consultez un diététicien'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.sante.fr/nutrition'],
        },
        // Athérosclérose
        {
          id: `conseil-${Date.now()}-${page}-7`,
          category: 'nutrition',
          disease: 'atherosclerose',
          title: '🥜 Consommer des graisses saines',
          description: 'Les graisses insaturées, comme celles des noix, réduisent le risque d’athérosclérose.',
          points: 10,
          tips: ['Consommez des noix non salées', 'Ajoutez de l’huile d’olive à vos plats', 'Limitez les graisses saturées'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.santepubliquefrance.fr'],
        },
        {
          id: `conseil-${Date.now()}-${page}-8`,
          category: 'activite',
          disease: 'atherosclerose',
          title: '🏃‍♂️ Exercice aérobique modéré',
          description: 'L’exercice aérobique améliore la circulation et réduit l’accumulation de plaque.',
          points: 15,
          tips: ['Marchez ou nagez 30 minutes par jour', 'Évitez les efforts intenses', 'Consultez votre médecin avant de commencer'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.who.int/fr'],
        },
        // Maladie coronarienne
        {
          id: `conseil-${Date.now()}-${page}-9`,
          category: 'prevention',
          disease: 'maladie-coronarienne',
          title: '🚭 Arrêter de fumer',
          description: 'Cesser de fumer réduit le risque de complications coronariennes.',
          points: 15,
          tips: ['Consultez un spécialiste pour arrêter', 'Utilisez des substituts nicotiniques', 'Rejoignez un groupe de soutien'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.who.int/fr'],
        },
        {
          id: `conseil-${Date.now()}-${page}-10`,
          category: 'nutrition',
          disease: 'maladie-coronarienne',
          title: '🐟 Poissons riches en oméga-3',
          description: 'Les oméga-3 protègent le cœur et réduisent l’inflammation.',
          points: 10,
          tips: ['Mangez du saumon ou du maquereau 2 fois par semaine', 'Évitez les fritures', 'Préférez la cuisson au four'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.sante.fr/nutrition'],
        },
        // Asthme
        {
          id: `conseil-${Date.now()}-${page}-11`,
          category: 'prevention',
          disease: 'asthme',
          title: '🌬️ Éviter les déclencheurs de l’asthme',
          description: 'Réduisez l’exposition aux allergènes comme la poussière et le pollen pour mieux gérer l’asthme.',
          points: 10,
          tips: ['Utilisez des filtres à air', 'Évitez de fumer', 'Portez un masque en extérieur'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.santepubliquefrance.fr'],
        },
        {
          id: `conseil-${Date.now()}-${page}-12`,
          category: 'activite',
          disease: 'asthme',
          title: '🏊 Natation pour l’asthme',
          description: 'La natation dans un environnement humide aide à renforcer les poumons sans déclencher de crises.',
          points: 10,
          tips: ['Nagez dans une piscine chauffée', 'Évitez les efforts intenses', 'Utilisez votre inhalateur avant l’exercice'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.who.int/fr'],
        },
        // BPCO
        {
          id: `conseil-${Date.now()}-${page}-13`,
          category: 'prevention',
          disease: 'bpco',
          title: '🚭 Cesser le tabagisme pour la BPCO',
          description: 'Arrêter de fumer ralentit la progression de la BPCO.',
          points: 15,
          tips: ['Consultez un pneumologue', 'Utilisez des patchs nicotiniques', 'Évitez les environnements enfumés'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.santepubliquefrance.fr'],
        },
        {
          id: `conseil-${Date.now()}-${page}-14`,
          category: 'activite',
          disease: 'bpco',
          title: '🧘 Exercices de respiration',
          description: 'Les exercices de respiration améliorent la capacité pulmonaire dans la BPCO.',
          points: 10,
          tips: ['Pratiquez la respiration diaphragmatique', 'Consultez un kinésithérapeute', 'Faites des exercices doux quotidiens'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.who.int/fr'],
        },
        // Fibrose pulmonaire
        {
          id: `conseil-${Date.now()}-${page}-15`,
          category: 'prevention',
          disease: 'fibrose-pulmonaire',
          title: '🩺 Suivi pulmonaire régulier',
          description: 'Un suivi médical régulier aide à surveiller la progression de la fibrose pulmonaire.',
          points: 10,
          tips: ['Planifiez des consultations trimestrielles', 'Surveillez les symptômes respiratoires', 'Évitez les infections pulmonaires'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.sante.fr'],
        },
        {
          id: `conseil-${Date.now()}-${page}-16`,
          category: 'activite',
          disease: 'fibrose-pulmonaire',
          title: '🚶 Marche douce pour la fibrose',
          description: 'Une marche légère améliore l’endurance sans surcharger les poumons.',
          points: 10,
          tips: ['Marchez à votre rythme', 'Utilisez un oxymètre de pouls', 'Reposez-vous si essoufflé'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.who.int/fr'],
        },
        // Hypothyroïdie
        {
          id: `conseil-${Date.now()}-${page}-17`,
          category: 'nutrition',
          disease: 'hypothyroidie',
          title: '🥗 Aliments riches en iode',
          description: 'L’iode soutient la fonction thyroïdienne dans l’hypothyroïdie.',
          points: 10,
          tips: ['Consommez des fruits de mer', 'Utilisez du sel iodé', 'Consultez un endocrinologue'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.sante.fr'],
        },
        {
          id: `conseil-${Date.now()}-${page}-18`,
          category: 'prevention',
          disease: 'hypothyroidie',
          title: '🩺 Suivi des niveaux hormonaux',
          description: 'Un suivi régulier des hormones thyroïdiennes optimise le traitement.',
          points: 10,
          tips: ['Faites des analyses sanguines régulières', 'Prenez vos médicaments à jeun', 'Signalez les symptômes à votre médecin'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.who.int/fr'],
        },
        // Hyperthyroïdie
        {
          id: `conseil-${Date.now()}-${page}-19`,
          category: 'nutrition',
          disease: 'hyperthyroidie',
          title: '🥦 Aliments anti-inflammatoires',
          description: 'Les légumes crucifères aident à réguler l’hyperthyroïdie.',
          points: 10,
          tips: ['Mangez du chou ou du brocoli', 'Évitez les aliments riches en iode', 'Consultez un diététicien'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.sante.fr/nutrition'],
        },
        {
          id: `conseil-${Date.now()}-${page}-20`,
          category: 'prevention',
          disease: 'hyperthyroidie',
          title: '🧘 Gestion du stress',
          description: 'Le stress peut aggraver l’hyperthyroïdie; la relaxation aide à le contrôler.',
          points: 10,
          tips: ['Pratiquez la méditation', 'Faites des exercices de respiration', 'Évitez les stimulants comme la caféine'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.who.int/fr'],
        },
        // Obésité
        {
          id: `conseil-${Date.now()}-${page}-21`,
          category: 'nutrition',
          disease: 'obesite',
          title: '🍎 Repas équilibrés pour l’obésité',
          description: 'Une alimentation équilibrée aide à gérer le poids corporel.',
          points: 10,
          tips: ['Mangez des repas riches en légumes', 'Limitez les sucres rapides', 'Consultez un nutritionniste'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.sante.fr/nutrition'],
        },
        {
          id: `conseil-${Date.now()}-${page}-22`,
          category: 'activite',
          disease: 'obesite',
          title: '🚴 Activité physique régulière',
          description: 'L’exercice régulier aide à brûler des calories et à améliorer la santé.',
          points: 15,
          tips: ['Faites 150 minutes d’exercice par semaine', 'Commencez par des activités douces', 'Trouvez un partenaire d’entraînement'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.who.int/fr'],
        },
        // Insuffisance rénale
        {
          id: `conseil-${Date.now()}-${page}-23`,
          category: 'nutrition',
          disease: 'insuffisance-renale',
          title: '🥗 Régime pauvre en sel',
          description: 'Un régime pauvre en sel aide à réduire la charge sur les reins.',
          points: 10,
          tips: ['Évitez les aliments transformés', 'Utilisez des herbes pour assaisonner', 'Consultez un diététicien'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.sante.fr/renal'],
        },
        {
          id: `conseil-${Date.now()}-${page}-24`,
          category: 'prevention',
          disease: 'insuffisance-renale',
          title: '💧 Hydratation contrôlée',
          description: 'Une hydratation adaptée aide à soutenir la fonction rénale.',
          points: 10,
          tips: ['Suivez les recommandations de votre médecin', 'Évitez les boissons sucrées', 'Surveillez votre apport en liquide'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.sante.fr'],
        },
        // Néphropathie diabétique
        {
          id: `conseil-${Date.now()}-${page}-25`,
          category: 'prevention',
          disease: 'nephropathie-diabetique',
          title: '🩺 Contrôle de la glycémie',
          description: 'Un bon contrôle de la glycémie protège les reins dans la néphropathie diabétique.',
          points: 10,
          tips: ['Surveillez votre glycémie quotidiennement', 'Suivez votre traitement', 'Consultez un endocrinologue'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.sante.fr'],
        },
        {
          id: `conseil-${Date.now()}-${page}-26`,
          category: 'nutrition',
          disease: 'nephropathie-diabetique',
          title: '🥕 Aliments à faible indice glycémique',
          description: 'Les aliments à faible indice glycémique aident à protéger les reins.',
          points: 10,
          tips: ['Privilégiez les légumes verts', 'Évitez les sucres rapides', 'Planifiez vos repas'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.sante.fr/nutrition'],
        },
        // Parkinson
        {
          id: `conseil-${Date.now()}-${page}-27`,
          category: 'activite',
          disease: 'parkinson',
          title: '🚶‍♂️ Exercices pour Parkinson',
          description: 'Les exercices physiques comme la marche aident à améliorer la mobilité et l’équilibre.',
          points: 15,
          tips: ['Marchez 20 minutes par jour', 'Pratiquez le tai-chi', 'Consultez un kinésithérapeute'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.parkinson.org'],
        },
        {
          id: `conseil-${Date.now()}-${page}-28`,
          category: 'education',
          disease: 'parkinson',
          title: '🧠 Thérapie occupationnelle',
          description: 'La thérapie occupationnelle aide à maintenir l’autonomie dans la maladie de Parkinson.',
          points: 10,
          tips: ['Travaillez avec un ergothérapeute', 'Pratiquez des activités manuelles', 'Adaptez votre environnement'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.parkinson.org'],
        },
        // Sclérose en plaques
        {
          id: `conseil-${Date.now()}-${page}-29`,
          category: 'activite',
          disease: 'sclerose-en-plaques',
          title: '🏊 Exercices à faible impact',
          description: 'Les exercices à faible impact aident à maintenir la mobilité dans la sclérose en plaques.',
          points: 10,
          tips: ['Essayez le yoga ou la natation', 'Évitez la surchauffe', 'Reposez-vous après l’effort'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.who.int/fr'],
        },
        {
          id: `conseil-${Date.now()}-${page}-30`,
          category: 'prevention',
          disease: 'sclerose-en-plaques',
          title: '🩺 Gestion des symptômes',
          description: 'Un suivi régulier aide à gérer les poussées de sclérose en plaques.',
          points: 10,
          tips: ['Consultez un neurologue régulièrement', 'Notez vos symptômes', 'Évitez le stress'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.mssociety.org.uk'],
        },
        // Épilepsie
        {
          id: `conseil-${Date.now()}-${page}-31`,
          category: 'prevention',
          disease: 'epilepsie',
          title: '💤 Sommeil régulier',
          description: 'Un sommeil suffisant réduit le risque de crises d’épilepsie.',
          points: 10,
          tips: ['Maintenez un horaire de sommeil régulier', 'Évitez les stimulants avant le coucher', 'Consultez un neurologue'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.epilepsy.com'],
        },
        {
          id: `conseil-${Date.now()}-${page}-32`,
          category: 'education',
          disease: 'epilepsie',
          title: '🩺 Respect des traitements',
          description: 'Prendre ses médicaments régulièrement réduit les crises.',
          points: 10,
          tips: ['Utilisez un pilulier', 'Notez les effets secondaires', 'Consultez si des ajustements sont nécessaires'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.sante.fr'],
        },
        // Migraine chronique
        {
          id: `conseil-${Date.now()}-${page}-33`,
          category: 'prevention',
          disease: 'migraine-chronique',
          title: '🧘 Éviter les déclencheurs de migraine',
          description: 'Identifier et éviter les déclencheurs réduit la fréquence des migraines.',
          points: 10,
          tips: ['Tenez un journal des migraines', 'Évitez les aliments riches en caféine', 'Maintenez un horaire régulier'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.migraine.com'],
        },
        {
          id: `conseil-${Date.now()}-${page}-34`,
          category: 'activite',
          disease: 'migraine-chronique',
          title: '🧘 Yoga pour les migraines',
          description: 'Le yoga aide à réduire le stress et les migraines chroniques.',
          points: 10,
          tips: ['Pratiquez des postures douces', 'Évitez les positions inversées', 'Consultez un instructeur spécialisé'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.who.int/fr'],
        },
        // Lupus
        {
          id: `conseil-${Date.now()}-${page}-35`,
          category: 'education',
          disease: 'lupus',
          title: '🩺 Gestion du lupus',
          description: 'Une gestion régulière avec un rhumatologue aide à contrôler les symptômes du lupus.',
          points: 10,
          tips: ['Évitez l’exposition prolongée au soleil', 'Suivez votre traitement', 'Reposez-vous suffisamment'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.lupus.org'],
        },
        {
          id: `conseil-${Date.now()}-${page}-36`,
          category: 'nutrition',
          disease: 'lupus',
          title: '🥗 Alimentation anti-inflammatoire',
          description: 'Une alimentation riche en antioxydants réduit l’inflammation liée au lupus.',
          points: 10,
          tips: ['Consommez des fruits rouges', 'Ajoutez du curcuma à vos plats', 'Évitez les aliments transformés'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.sante.fr/nutrition'],
        },
        // Polyarthrite rhumatoïde
        {
          id: `conseil-${Date.now()}-${page}-37`,
          category: 'activite',
          disease: 'polyarthrite-rhumatoide',
          title: '🏊 Exercices doux pour les articulations',
          description: 'Les exercices doux préservent la mobilité dans la polyarthrite rhumatoïde.',
          points: 10,
          tips: ['Essayez la natation', 'Évitez les mouvements brusques', 'Consultez un physiothérapeute'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.who.int/fr'],
        },
        {
          id: `conseil-${Date.now()}-${page}-38`,
          category: 'prevention',
          disease: 'polyarthrite-rhumatoide',
          title: '🩺 Suivi rhumatologique',
          description: 'Un suivi régulier aide à gérer les poussées de polyarthrite rhumatoïde.',
          points: 10,
          tips: ['Prenez vos médicaments comme prescrit', 'Signalez tout symptôme nouveau', 'Reposez-vous pendant les poussées'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.arthritis.org'],
        },
        // Maladie de Crohn
        {
          id: `conseil-${Date.now()}-${page}-39`,
          category: 'nutrition',
          disease: 'crohn',
          title: '🥗 Régime adapté pour Crohn',
          description: 'Un régime adapté réduit les symptômes de la maladie de Crohn.',
          points: 10,
          tips: ['Évitez les aliments riches en fibres pendant les poussées', 'Consommez des repas fractionnés', 'Consultez un diététicien'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.crohnscolitisfoundation.org'],
        },
        {
          id: `conseil-${Date.now()}-${page}-40`,
          category: 'prevention',
          disease: 'crohn',
          title: '🧘 Gestion du stress pour Crohn',
          description: 'Le stress peut aggraver les symptômes de Crohn; la relaxation aide.',
          points: 10,
          tips: ['Pratiquez la méditation', 'Faites des exercices de respiration', 'Consultez un psychologue si nécessaire'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.who.int/fr'],
        },
        // Colite ulcéreuse
        {
          id: `conseil-${Date.now()}-${page}-41`,
          category: 'nutrition',
          disease: 'colite-ulcereuse',
          title: '🍎 Alimentation douce pour la colite',
          description: 'Une alimentation douce réduit l’irritation dans la colite ulcéreuse.',
          points: 10,
          tips: ['Évitez les aliments épicés', 'Consommez des aliments cuits', 'Tenez un journal alimentaire'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.crohnscolitisfoundation.org'],
        },
        {
          id: `conseil-${Date.now()}-${page}-42`,
          category: 'prevention',
          disease: 'colite-ulcereuse',
          title: '🩺 Suivi gastro-entérologique',
          description: 'Un suivi régulier aide à gérer la colite ulcéreuse.',
          points: 10,
          tips: ['Planifiez des coloscopies régulières', 'Signalez les symptômes nouveaux', 'Suivez votre traitement'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.sante.fr'],
        },
        // Cancer du sein
        {
          id: `conseil-${Date.now()}-${page}-43`,
          category: 'education',
          disease: 'cancer-sein',
          title: '🩺 Dépistage précoce du cancer du sein',
          description: 'Un dépistage régulier peut détecter le cancer à un stade précoce pour un meilleur traitement.',
          points: 10,
          tips: ['Planifiez des mammographies régulières', 'Consultez pour tout symptôme inhabituel', 'Informez-vous sur les facteurs de risque'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.cancer.org'],
        },
        {
          id: `conseil-${Date.now()}-${page}-44`,
          category: 'activite',
          disease: 'cancer-sein',
          title: '🚶 Activité physique pour la prévention',
          description: 'L’exercice réduit le risque de récidive du cancer du sein.',
          points: 10,
          tips: ['Marchez 30 minutes par jour', 'Essayez le yoga', 'Consultez votre médecin avant de commencer'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.cancer.org'],
        },
        // Cancer de la prostate
        {
          id: `conseil-${Date.now()}-${page}-45`,
          category: 'education',
          disease: 'cancer-prostate',
          title: '🩺 Dépistage du cancer de la prostate',
          description: 'Un dépistage régulier aide à détecter le cancer de la prostate tôt.',
          points: 10,
          tips: ['Faites un test PSA annuel', 'Consultez un urologue', 'Discutez des antécédents familiaux'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.cancer.org'],
        },
        {
          id: `conseil-${Date.now()}-${page}-46`,
          category: 'nutrition',
          disease: 'cancer-prostate',
          title: '🍅 Aliments riches en lycopène',
          description: 'Le lycopène, présent dans les tomates, peut réduire le risque de cancer de la prostate.',
          points: 10,
          tips: ['Mangez des tomates cuites', 'Ajoutez des légumes rouges', 'Évitez les graisses saturées'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.sante.fr/nutrition'],
        },
        // Cancer du poumon
        {
          id: `conseil-${Date.now()}-${page}-47`,
          category: 'prevention',
          disease: 'cancer-poumon',
          title: '🚭 Arrêter de fumer',
          description: 'Cesser de fumer est crucial pour réduire le risque de cancer du poumon.',
          points: 15,
          tips: ['Consultez un spécialiste', 'Utilisez des substituts nicotiniques', 'Rejoignez un groupe de soutien'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.cancer.org'],
        },
        {
          id: `conseil-${Date.now()}-${page}-48`,
          category: 'education',
          disease: 'cancer-poumon',
          title: '🩺 Dépistage précoce',
          description: 'Un dépistage par scanner peut détecter le cancer du poumon à un stade précoce.',
          points: 10,
          tips: ['Consultez un pneumologue', 'Discutez des antécédents de tabagisme', 'Planifiez un dépistage si à risque'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.cancer.org'],
        },
        // Leucémie
        {
          id: `conseil-${Date.now()}-${page}-49`,
          category: 'prevention',
          disease: 'leucemie',
          title: '🩺 Suivi hématologique',
          description: 'Un suivi régulier aide à surveiller les marqueurs de la leucémie.',
          points: 10,
          tips: ['Faites des analyses sanguines régulières', 'Signalez tout symptôme', 'Consultez un hématologue'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.cancer.org'],
        },
        {
          id: `conseil-${Date.now()}-${page}-50`,
          category: 'nutrition',
          disease: 'leucemie',
          title: '🥗 Alimentation pour l’immunité',
          description: 'Une alimentation riche en nutriments soutient le système immunitaire.',
          points: 10,
          tips: ['Consommez des fruits et légumes', 'Évitez les aliments crus', 'Consultez un diététicien'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.sante.fr/nutrition'],
        },
        // Arthrose
        {
          id: `conseil-${Date.now()}-${page}-51`,
          category: 'activite',
          disease: 'arthrose',
          title: '🏊 Natation pour l’arthrose',
          description: 'La natation soulage les douleurs articulaires en réduisant la pression sur les articulations.',
          points: 15,
          tips: ['Nagez 2 fois par semaine', 'Privilégiez les piscines chauffées', 'Consultez un physiothérapeute'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.santepubliquefrance.fr'],
        },
        {
          id: `conseil-${Date.now()}-${page}-52`,
          category: 'nutrition',
          disease: 'arthrose',
          title: '🥗 Aliments anti-inflammatoires',
          description: 'Les aliments riches en oméga-3 réduisent l’inflammation articulaire.',
          points: 10,
          tips: ['Mangez du poisson gras', 'Ajoutez des noix à votre alimentation', 'Évitez les aliments transformés'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.sante.fr/nutrition'],
        },
        // Ostéoporose
        {
          id: `conseil-${Date.now()}-${page}-53`,
          category: 'nutrition',
          disease: 'osteoporose',
          title: '🥛 Calcium pour les os',
          description: 'Le calcium renforce les os et prévient l’ostéoporose.',
          points: 10,
          tips: ['Consommez des produits laitiers', 'Ajoutez des légumes verts', 'Consultez pour un supplément si nécessaire'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.sante.fr/nutrition'],
        },
        {
          id: `conseil-${Date.now()}-${page}-54`,
          category: 'activite',
          disease: 'osteoporose',
          title: '🏋️ Exercices de renforcement',
          description: 'Les exercices de renforcement musculaire améliorent la densité osseuse.',
          points: 10,
          tips: ['Faites des exercices avec poids légers', 'Marchez régulièrement', 'Consultez un physiothérapeute'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.who.int/fr'],
        },
        // Fibromyalgie
        {
          id: `conseil-${Date.now()}-${page}-55`,
          category: 'activite',
          disease: 'fibromyalgie',
          title: '🧘 Yoga pour la fibromyalgie',
          description: 'Le yoga aide à réduire la douleur et à améliorer la flexibilité.',
          points: 10,
          tips: ['Pratiquez des postures douces', 'Évitez la surchauffe', 'Consultez un instructeur spécialisé'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.sante.fr'],
        },
        {
          id: `conseil-${Date.now()}-${page}-56`,
          category: 'prevention',
          disease: 'fibromyalgie',
          title: '💤 Gestion du sommeil',
          description: 'Un sommeil de qualité réduit les symptômes de la fibromyalgie.',
          points: 10,
          tips: ['Maintenez un horaire régulier', 'Évitez les écrans avant le coucher', 'Créez un environnement calme'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.who.int/fr'],
        },
        // Dépression
        {
          id: `conseil-${Date.now()}-${page}-57`,
          category: 'prevention',
          disease: 'depression',
          title: '🧘‍♀️ Méditation pour la santé mentale',
          description: 'La méditation peut aider à réduire les symptômes de la dépression.',
          points: 10,
          tips: ['Pratiquez 10 minutes par jour', 'Trouvez un endroit calme', 'Utilisez des applications de méditation guidée'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.who.int/fr/mental-health'],
        },
        {
          id: `conseil-${Date.now()}-${page}-58`,
          category: 'activite',
          disease: 'depression',
          title: '🚶 Marche pour la dépression',
          description: 'La marche régulière améliore l’humeur et réduit les symptômes dépressifs.',
          points: 10,
          tips: ['Marchez 20 minutes par jour', 'Privilégiez la nature', 'Marchez avec un ami'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.sante.fr'],
        },
        // Troubles anxieux
        {
          id: `conseil-${Date.now()}-${page}-59`,
          category: 'prevention',
          disease: 'troubles-anxieux',
          title: '🧘 Techniques de relaxation',
          description: 'Les techniques de relaxation réduisent l’anxiété généralisée.',
          points: 10,
          tips: ['Pratiquez la respiration profonde', 'Essayez la méditation guidée', 'Consultez un thérapeute'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.who.int/fr/mental-health'],
        },
        {
          id: `conseil-${Date.now()}-${page}-60`,
          category: 'activite',
          disease: 'troubles-anxieux',
          title: '🏃 Activité physique pour l’anxiété',
          description: 'L’exercice physique aide à réduire les symptômes d’anxiété.',
          points: 10,
          tips: ['Faites 30 minutes d’exercice modéré', 'Essayez le jogging', 'Évitez les stimulants comme la caféine'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.sante.fr'],
        },
        // Schizophrénie
        {
          id: `conseil-${Date.now()}-${page}-61`,
          category: 'education',
          disease: 'schizophrenie',
          title: '🩺 Suivi psychiatrique',
          description: 'Un suivi régulier avec un psychiatre aide à gérer la schizophrénie.',
          points: 10,
          tips: ['Prenez vos médicaments comme prescrit', 'Notez les effets secondaires', 'Consultez régulièrement'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.sante.fr'],
        },
        {
          id: `conseil-${Date.now()}-${page}-62`,
          category: 'prevention',
          disease: 'schizophrenie',
          title: '🧘 Gestion du stress',
          description: 'Réduire le stress aide à minimiser les symptômes de la schizophrénie.',
          points: 10,
          tips: ['Pratiquez la relaxation', 'Évitez les situations stressantes', 'Rejoignez un groupe de soutien'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.who.int/fr/mental-health'],
        },
        // Trouble bipolaire
        {
          id: `conseil-${Date.now()}-${page}-63`,
          category: 'prevention',
          disease: 'trouble-bipolaire',
          title: '💤 Routine de sommeil',
          description: 'Une routine de sommeil stable aide à gérer le trouble bipolaire.',
          points: 10,
          tips: ['Maintenez des horaires réguliers', 'Évitez les stimulants avant le coucher', 'Consultez un psychiatre'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.sante.fr'],
        },
        {
          id: `conseil-${Date.now()}-${page}-64`,
          category: 'education',
          disease: 'trouble-bipolaire',
          title: '🩺 Suivi des humeurs',
          description: 'Tenir un journal des humeurs aide à identifier les déclencheurs.',
          points: 10,
          tips: ['Notez vos émotions quotidiennes', 'Partagez avec votre thérapeute', 'Utilisez une application dédiée'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.who.int/fr/mental-health'],
        },
        // Cirrhose
        {
          id: `conseil-${Date.now()}-${page}-65`,
          category: 'nutrition',
          disease: 'cirrhose',
          title: '🍏 Alimentation saine pour le foie',
          description: 'Une alimentation équilibrée protège le foie et ralentit la progression de la cirrhose.',
          points: 10,
          tips: ['Évitez l’alcool', 'Consommez des légumes verts', 'Limitez les graisses saturées'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.who.int/fr'],
        },
        {
          id: `conseil-${Date.now()}-${page}-66`,
          category: 'prevention',
          disease: 'cirrhose',
          title: '🩺 Vaccination hépatique',
          description: 'Les vaccins contre l’hépatite protègent le foie dans la cirrhose.',
          points: 10,
          tips: ['Vérifiez votre statut vaccinal', 'Consultez un hépatologue', 'Évitez les infections'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.sante.fr'],
        },
        // Psoriasis
        {
          id: `conseil-${Date.now()}-${page}-67`,
          category: 'prevention',
          disease: 'psoriasis',
          title: '🧴 Hydratation de la peau',
          description: 'Une peau bien hydratée réduit les symptômes du psoriasis.',
          points: 10,
          tips: ['Utilisez des crèmes émollientes', 'Évitez les douches chaudes', 'Consultez un dermatologue'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.psoriasis.org'],
        },
        {
          id: `conseil-${Date.now()}-${page}-68`,
          category: 'nutrition',
          disease: 'psoriasis',
          title: '🥗 Alimentation anti-inflammatoire',
          description: 'Une alimentation riche en antioxydants réduit l’inflammation du psoriasis.',
          points: 10,
          tips: ['Consommez des poissons gras', 'Ajoutez des fruits rouges', 'Évitez les aliments transformés'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.sante.fr/nutrition'],
        },
        // Endométriose
        {
          id: `conseil-${Date.now()}-${page}-69`,
          category: 'prevention',
          disease: 'endometriose',
          title: '🩺 Suivi gynécologique',
          description: 'Un suivi régulier aide à gérer les symptômes de l’endométriose.',
          points: 10,
          tips: ['Consultez un gynécologue régulièrement', 'Notez vos douleurs', 'Discutez des options de traitement'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.sante.fr'],
        },
        {
          id: `conseil-${Date.now()}-${page}-70`,
          category: 'nutrition',
          disease: 'endometriose',
          title: '🥗 Régime anti-inflammatoire',
          description: 'Une alimentation anti-inflammatoire peut réduire les douleurs de l’endométriose.',
          points: 10,
          tips: ['Consommez des légumes verts', 'Évitez les aliments transformés', 'Ajoutez des oméga-3'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.sante.fr/nutrition'],
        },
        // VIH
        {
          id: `conseil-${Date.now()}-${page}-71`,
          category: 'education',
          disease: 'vih',
          title: '📚 Sensibilisation au VIH',
          description: 'Connaître les modes de transmission du VIH aide à mieux se protéger.',
          points: 10,
          tips: ['Informez-vous auprès de sources fiables', 'Participez à des campagnes locales', 'Consultez régulièrement'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.unaids.org/fr'],
        },
        {
          id: `conseil-${Date.now()}-${page}-72`,
          category: 'prevention',
          disease: 'vih',
          title: '🩺 Adhérence au traitement',
          description: 'Prendre son traitement antirétroviral régulièrement maintient une charge virale indétectable.',
          points: 10,
          tips: ['Utilisez un pilulier', 'Planifiez vos prises', 'Consultez un infectiologue'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.sante.fr'],
        },
        // Général
        {
          id: `conseil-${Date.now()}-${page}-73`,
          category: 'prevention',
          disease: 'general',
          title: '🧴 Protection solaire',
          description: 'Utilisez une crème solaire pour protéger votre peau des rayons UV.',
          points: 5,
          tips: ['Appliquez toutes les 2 heures', 'Portez un chapeau', 'Évitez le soleil entre 12h et 16h'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.santepubliquefrance.fr'],
        },
        {
          id: `conseil-${Date.now()}-${page}-74`,
          category: 'activite',
          disease: 'general',
          title: '🚶 Activité physique quotidienne',
          description: 'Une activité physique régulière améliore la santé globale.',
          points: 10,
          tips: ['Marchez 30 minutes par jour', 'Essayez des activités variées', 'Fixez des objectifs réalistes'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.who.int/fr'],
        },
      ];

      const existingIds = conseils.map(c => c.id);
      const newConseils = conseilPool.filter(c => !existingIds.includes(c.id));
      const updatedConseils = page === 1 ? newConseils : [...conseils, ...newConseils];
      await AsyncStorage.setItem('cachedConseils', JSON.stringify(updatedConseils));
      return updatedConseils;
    } catch (error) {
      console.error('Erreur récupération conseils:', error);
      const cached = await AsyncStorage.getItem('cachedConseils');
      return cached ? JSON.parse(cached) : [];
    } finally {
      setLoading(false);
    }
  };

  const fetchQuizzes = async (page: number): Promise<Quiz[]> => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const quizPool: Quiz[] = [
        {
          id: `quiz-${Date.now()}-${page}-1`,
          question: '🍎 Quel fruit est recommandé pour le diabète ?',
          options: ['Mangue', 'Banane', 'Pomme', 'Raisin'],
          correctAnswer: 'Pomme',
          disease: 'diabete',
          explanation: 'Les pommes ont un index glycémique modéré et sont riches en fibres.',
          points: 15,
          timeLimit: 30,
        },
        {
          id: `quiz-${Date.now()}-${page}-2`,
          question: '🧘 Quel exercice réduit le stress ?',
          options: ['Yoga', 'Course rapide', 'Haltérophilie', 'Natation'],
          correctAnswer: 'Yoga',
          disease: 'hypertension',
          explanation: 'Le yoga combine respiration et mouvements doux pour réduire le stress.',
          points: 20,
          timeLimit: 40,
        },
        {
          id: `quiz-${Date.now()}-${page}-3`,
          question: '💉 Pourquoi les vaccins sont-ils importants ?',
          options: ['Pour perdre du poids', 'Pour prévenir les maladies', 'Pour augmenter la force', 'Pour améliorer la vue'],
          correctAnswer: 'Pour prévenir les maladies',
          disease: 'general',
          explanation: 'Les vaccins protègent contre de nombreuses maladies infectieuses.',
          points: 10,
          timeLimit: 25,
        },
        {
          id: `quiz-${Date.now()}-${page}-4`,
          question: '🩺 À quelle fréquence vérifier sa tension ?',
          options: ['Une fois par an', 'Tous les mois', 'Tous les jours', 'Une fois par semaine'],
          correctAnswer: 'Tous les mois',
          disease: 'hypertension',
          explanation: 'Un contrôle mensuel permet de surveiller efficacement la tension artérielle.',
          points: 15,
          timeLimit: 35,
        },
        {
          id: `quiz-${Date.now()}-${page}-5`,
          question: '🌬️ Quel est un déclencheur courant de l’asthme ?',
          options: ['Sucre', 'Poussière', 'Eau', 'Légumes'],
          correctAnswer: 'Poussière',
          disease: 'asthme',
          explanation: 'La poussière peut déclencher des crises d’asthme en irritant les voies respiratoires.',
          points: 15,
          timeLimit: 30,
        },
        {
          id: `quiz-${Date.now()}-${page}-6`,
          question: '🧠 Quel symptôme est courant dans la maladie de Parkinson ?',
          options: ['Tremblements', 'Perte de cheveux', 'Fièvre', 'Toux'],
          correctAnswer: 'Tremblements',
          disease: 'parkinson',
          explanation: 'Les tremblements sont un symptôme caractéristique de la maladie de Parkinson.',
          points: 20,
          timeLimit: 40,
        },
        {
          id: `quiz-${Date.now()}-${page}-7`,
          question: '🩺 Quel est un facteur de risque du cancer du sein ?',
          options: ['Boire de l’eau', 'Tabagisme', 'Exercice physique', 'Antécédents familiaux'],
          correctAnswer: 'Antécédents familiaux',
          disease: 'cancer-sein',
          explanation: 'Les antécédents familiaux augmentent le risque de cancer du sein.',
          points: 15,
          timeLimit: 35,
        },
        {
          id: `quiz-${Date.now()}-${page}-8`,
          question: '🥗 Quel nutriment limiter pour l’insuffisance rénale ?',
          options: ['Sucre', 'Sel', 'Vitamine C', 'Fibres'],
          correctAnswer: 'Sel',
          disease: 'insuffisance-renale',
          explanation: 'Réduire le sel aide à gérer la pression sur les reins.',
          points: 15,
          timeLimit: 30,
        },
        {
          id: `quiz-${Date.now()}-${page}-9`,
          question: '🧘‍♀️ Quelle activité aide à gérer la dépression ?',
          options: ['Méditation', 'Jeux vidéo', 'Consommation d’alcool', 'Fumer'],
          correctAnswer: 'Méditation',
          disease: 'depression',
          explanation: 'La méditation réduit les symptômes de la dépression en favorisant la relaxation.',
          points: 10,
          timeLimit: 30,
        },
        {
          id: `quiz-${Date.now()}-${page}-10`,
          question: '🏊 Quelle activité est bénéfique pour l’arthrose ?',
          options: ['Course à pied', 'Natation', 'Haltérophilie', 'Escalade'],
          correctAnswer: 'Natation',
          disease: 'arthrose',
          explanation: 'La natation réduit la pression sur les articulations tout en améliorant la mobilité.',
          points: 15,
          timeLimit: 35,
        },
      ];

      const existingIds = quizzes.map(q => q.id);
      const newQuizzes = quizPool.filter(q => !existingIds.includes(q.id));
      const updatedQuizzes = page === 1 ? newQuizzes : [...quizzes, ...newQuizzes];
      await AsyncStorage.setItem('cachedQuizzes', JSON.stringify(updatedQuizzes));
      return updatedQuizzes;
    } catch (error) {
      console.error('Erreur récupération quiz:', error);
      const cached = await AsyncStorage.getItem('cachedQuizzes');
      return cached ? JSON.parse(cached) : [];
    } finally {
      setLoading(false);
    }
  };

  function getWeekEnd(): string {
    const now = new Date();
    const daysUntilSunday = 7 - now.getDay();
    const weekEnd = new Date(now);
    weekEnd.setDate(now.getDate() + daysUntilSunday);
    return weekEnd.toDateString();
  }

  function getMonthEnd(): string {
    const now = new Date();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return monthEnd.toDateString();
  }




const requestMicrophonePermission = async () => {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message: 'This app needs access to your microphone to enable voice recognition.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn('Permission error:', err);
      return false;
    }
  }
  return true;
};

const startRecording = async () => {
  if (!Voice || !Voice._loaded) {
    console.error('Voice module is not loaded');
    Alert.alert('Erreur', 'Module de reconnaissance vocale non chargé.');
    speak('Module de reconnaissance vocale non chargé.', 'fr-FR');
    return;
  }
  const hasPermission = await requestMicrophonePermission();
  if (!hasPermission) {
    Alert.alert('Permission refusée', 'Veuillez autoriser l’accès au microphone.');
    speak('Veuillez autoriser l’accès au microphone.', 'fr-FR');
    return;
  }
  try {
    await Voice.start('fr-FR');
    setIsRecording(true);
  } catch (error) {
    console.error('Erreur démarrage reconnaissance vocale:', error);
    Alert.alert('Erreur', 'Impossible de démarrer la reconnaissance vocale.');
    speak('Erreur lors du démarrage de la reconnaissance vocale.', 'fr-FR');
  }
};

useEffect(() => {
  console.log('Voice module:', Voice);
  loadProgress();
  updateStreak();
  fetchInitialData();

  const initializeVoice = async () => {
    if (!Voice) {
      console.error('Voice module is undefined');
      Alert.alert('Erreur', 'Module de reconnaissance vocale non disponible.');
      speak('Module de reconnaissance vocale non disponible.', 'fr-FR');
      return;
    }

    // Wait for the module to load
    let attempts = 0;
    while (!Voice._loaded && attempts < 5) {
      console.log('Waiting for Voice module to load...');
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
    }
    if (!Voice._loaded) {
      console.error('Voice module failed to load after retries');
      Alert.alert('Erreur', 'Module de reconnaissance vocale non chargé.');
      speak('Module de reconnaissance vocale non chargé.', 'fr-FR');
      return;
    }

    // Set up event listeners
    Voice.onSpeechStart = () => {
      console.log('Speech recognition started');
      setIsRecording(true);
    };
    Voice.onSpeechEnd = () => {
      console.log('Speech recognition ended');
      setIsRecording(false);
    };
    Voice.onSpeechError = (e: any) => {
      console.error('Speech recognition error:', e);
      setIsRecording(false);
      Alert.alert('Erreur', 'Impossible de reconnaître la parole. Veuillez réessayer.');
      speak('Erreur de reconnaissance vocale. Veuillez réessayer.', 'fr-FR');
    };
    Voice.onSpeechResults = (e: any) => {
      console.log('Speech recognition results:', e);
      const text = e.value[0]?.toLowerCase();
      setRecognizedText(text);
      handleVoiceAnswer(text);
    };
  };

  initializeVoice();

  return () => {
    if (Voice) {
      Voice.destroy().then(() => {
        console.log('Voice module destroyed');
        Voice.removeAllListeners();
      });
    }
  };
}, []);

  useEffect(() => {
    updateBadges();
    updateChallenges();
    saveProgress();
    checkQuizCompletion();
  }, [userPoints, completedQuizzes, favoriteConseils]);

  const fetchInitialData = async () => {
    const initialConseils = await fetchConseils(1);
    const initialQuizzes = await fetchQuizzes(1);
    setConseils(initialConseils);
    setQuizzes(initialQuizzes);
  };

  const checkQuizCompletion = () => {
    if (quizzes.length > 0 && quizzes.every(quiz => completedQuizzes.includes(quiz.id))) {
      Alert.alert(
        'Quiz terminés !',
        'Vous avez complété tous les quiz disponibles. Voulez-vous charger plus de quiz ?',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Charger',
            onPress: async () => {
              setPageQuizzes(1);
              const newQuizzes = await fetchQuizzes(1);
              setQuizzes(newQuizzes);
              setCompletedQuizzes([]);
              speak('Quiz chargés !', 'fr-FR');
            },
          },
        ]
      );
    }
  };

  const updateStreak = () => {
    const today = new Date().toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (userProgress.lastVisit === today) {
      return;
    } else if (userProgress.lastVisit === yesterday.toDateString()) {
      setUserProgress(prev => ({
        ...prev,
        streak: prev.streak + 1,
        lastVisit: today,
        completedToday: 0,
      }));
    } else {
      setUserProgress(prev => ({
        ...prev,
        streak: 1,
        lastVisit: today,
        completedToday: 0,
      }));
    }
  };

  const loadProgress = async () => {
    try {
      const points = await AsyncStorage.getItem('userPoints');
      const completed = await AsyncStorage.getItem('completedQuizzes');
      const favorites = await AsyncStorage.getItem('favoriteConseils');
      const badgesData = await AsyncStorage.getItem('unlockedBadges');
      const progressData = await AsyncStorage.getItem('userProgress');

      if (points) setUserPoints(parseInt(points));
      if (completed) setCompletedQuizzes(JSON.parse(completed));
      if (favorites) setFavoriteConseils(JSON.parse(favorites));
      if (progressData) setUserProgress(JSON.parse(progressData));

      if (badgesData) {
        const unlockedIds = JSON.parse(badgesData);
        setBadges(prev =>
          prev.map(badge => ({
            ...badge,
            unlocked: unlockedIds.includes(badge.id),
          }))
        );
      }
    } catch (error) {
      console.error('Erreur chargement progression:', error);
    }
  };

  const saveProgress = async () => {
    try {
      await AsyncStorage.setItem('userPoints', userPoints.toString());
      await AsyncStorage.setItem('completedQuizzes', JSON.stringify(completedQuizzes));
      await AsyncStorage.setItem('favoriteConseils', JSON.stringify(favoriteConseils));
      await AsyncStorage.setItem('userProgress', JSON.stringify(userProgress));

      const unlockedIds = badges.filter(b => b.unlocked).map(b => b.id);
      await AsyncStorage.setItem('unlockedBadges', JSON.stringify(unlockedIds));
    } catch (error) {
      console.error('Erreur sauvegarde progression:', error);
    }
  };

  const updateBadges = () => {
    const updatedBadges = badges.map(badge => {
      if (!badge.unlocked) {
        let shouldUnlock = false;

        if (badge.requiredPoints > 0 && userPoints >= badge.requiredPoints) {
          shouldUnlock = true;
        }

        if (badge.id === 'assidu' && userProgress.streak >= 7) {
          shouldUnlock = true;
        }

        if (badge.id === 'quizmaster' && completedQuizzes.length >= 10) {
          shouldUnlock = true;
        }

        if (shouldUnlock) {
          speak(`Félicitations ! Vous avez débloqué le badge ${badge.name}`, 'fr-FR');
          return { ...badge, unlocked: true, dateUnlocked: new Date().toISOString() };
        }
      }
      return badge;
    });

    if (JSON.stringify(updatedBadges) !== JSON.stringify(badges)) {
      setBadges(updatedBadges);
    }
  };

  const updateChallenges = () => {
    const updatedChallenges = challenges.map(challenge => {
      let current = challenge.current;
      if (challenge.id === 'daily1') {
        current = userProgress.completedToday;
      } else if (challenge.id === 'weekly1') {
        current = favoriteConseils.length;
      } else if (challenge.id === 'monthly1') {
        current = userPoints;
      }
      if (current >= challenge.target && challenge.current < challenge.target) {
        setUserPoints(prev => prev + challenge.reward);
        speak(`Félicitations ! Défi ${challenge.title} complété ! +${challenge.reward} points`, 'fr-FR');
        Alert.alert('Défi réussi !', `Vous avez complété ${challenge.title} et gagné ${challenge.reward} points !`);
      }
      return { ...challenge, current };
    });
    setChallenges(updatedChallenges);
  };

  const handleQuizAnswer = (quiz: Quiz, selectedOption: string) => {
    if (completedQuizzes.includes(quiz.id)) {
      Alert.alert('Déjà complété', 'Vous avez déjà répondu à ce quiz !');
      return;
    }

    if (selectedOption === quiz.correctAnswer) {
      const newPoints = userPoints + quiz.points;
      setUserPoints(newPoints);
      setCompletedQuizzes(prev => [...prev, quiz.id]);

      setUserProgress(prev => ({
        ...prev,
        completedToday: prev.completedToday + 1,
        monthlyStats: {
          ...prev.monthlyStats,
          [new Date().toISOString().split('T')[0]]: (prev.monthlyStats[new Date().toISOString().split('T')[0]] || 0) + 1,
        },
      }));

      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0.5, duration: 200, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();

      Alert.alert(
        '🎉 Excellent !',
        `Bonne réponse ! +${quiz.points} points\n\n💡 ${quiz.explanation}`,
        [{ text: 'Continuer', onPress: saveProgress }]
      );
      speak(`Bonne réponse ! Vous gagnez ${quiz.points} points. ${quiz.explanation}`, 'fr-FR');
    } else {
      Alert.alert('❌ Pas tout à fait', `La bonne réponse était : ${quiz.correctAnswer}\n\n💡 ${quiz.explanation}`);
      speak(`Réponse incorrecte. La bonne réponse était ${quiz.correctAnswer}. ${quiz.explanation}`, 'fr-FR');
    }
  };

  const handleVoiceAnswer = (text: string) => {
    if (!selectedQuiz) return;

    const normalizedText = text.toLowerCase().trim();
    const matchedOption = selectedQuiz.options.find(option =>
      option.toLowerCase().includes(normalizedText) || normalizedText.includes(option.toLowerCase())
    );

    if (matchedOption) {
      handleQuizAnswer(selectedQuiz, matchedOption);
    } else {
      Alert.alert('Non reconnu', 'Votre réponse n’a pas été reconnue. Veuillez réessayer.');
      speak('Réponse non reconnue. Veuillez réessayer.', 'fr-FR');
    }
  };

  const toggleFavorite = (conseilId: string) => {
    setFavoriteConseils(prev => {
      if (prev.includes(conseilId)) {
        speak('Conseil retiré des favoris', 'fr-FR');
        return prev.filter(id => id !== conseilId);
      } else {
        setUserPoints(prev => prev + 5);
        speak('Conseil ajouté aux favoris', 'fr-FR');
        return [...prev, conseilId];
      }
    });
  };

  const shareConseil = async (conseil: Conseil) => {
    try {
      const message = `🌟 Conseil Santé Yafa 🌟\n\n${conseil.title}\n\n${conseil.description}\n\n📱 Téléchargez l'app Yafa pour plus de conseils santé !`;

      await Share.share({
        message: message,
        title: 'Conseil Santé Yafa',
      });

      setUserPoints(prev => prev + 5);
      const shareCount = (badges.find(b => b.id === 'partageur')?.requiredPoints || 0) + 1;
      if (shareCount >= 5) {
        setBadges(prev => prev.map(b => (b.id === 'partageur' ? { ...b, unlocked: true, dateUnlocked: new Date().toISOString() } : b)));
        speak('Badge Ambassadeur Santé débloqué !', 'fr-FR');
      }
      speak('Merci de partager nos conseils santé !', 'fr-FR');
    } catch (error) {
      console.error('Erreur partage:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setPageConseils(1);
    setPageQuizzes(1);
    setCompletedQuizzes([]);
    const newConseils = await fetchConseils(1);
    const newQuizzes = await fetchQuizzes(1);
    setConseils(newConseils);
    setQuizzes(newQuizzes);
    setRefreshing(false);
    speak('Contenu mis à jour', 'fr-FR');
  };

  const loadMoreConseils = async () => {
    if (!loading) {
      const nextPage = pageConseils + 1;
      setPageConseils(nextPage);
      const newConseils = await fetchConseils(nextPage);
      setConseils(newConseils);
      speak('Plus de conseils chargés !', 'fr-FR');
    }
  };

  const loadMoreQuizzes = async () => {
    if (!loading) {
      const nextPage = pageQuizzes + 1;
      setPageQuizzes(nextPage);
      const newQuizzes = await fetchQuizzes(nextPage);
      setQuizzes(newQuizzes);
      speak('Plus de quiz chargés !', 'fr-FR');
    }
  };

  const filteredConseils = conseils.filter(conseil =>
    (selectedFilter === 'all' || conseil.disease === selectedFilter) &&
    (searchQuery === '' ||
      conseil.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conseil.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredQuizzes = quizzes.filter
  (quiz =>
(selectedFilter === 'all' || quiz.disease === selectedFilter) &&
(searchQuery === '' ||
quiz.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
quiz.explanation.toLowerCase().includes(searchQuery.toLowerCase()))
);


const stopRecording = async () => {
try {
await Voice.stop();
setIsRecording(false);
} catch (error) {
console.error('Erreur arrêt reconnaissance vocale:', error);
Alert.alert('Erreur', 'Impossible d’arrêter la reconnaissance vocale.');
speak('Erreur lors de l’arrêt de la reconnaissance vocale.', 'fr-FR');
}
};

const renderConseilItem = ({ item }: { item: Conseil }) => (
<TouchableOpacity
  style={styles.conseilCard}
  onPress={() => {
    setSelectedConseil(item);
    setShowDetailsModal(true);
    speak(item.title, 'fr-FR');
  }}
>
  <View style={styles.conseilHeader}>
    <Text style={styles.conseilTitle}>{item.title}</Text>
    <TouchableOpacity onPress={() => toggleFavorite(item.id)}>
      <MaterialIcons
        name={favoriteConseils.includes(item.id) ? 'favorite' : 'favorite-border'}
        size={24}
        color={favoriteConseils.includes(item.id) ? '#ff5252' : '#757575'}
      />
    </TouchableOpacity>
  </View>
  <Text style={styles.conseilDescription} numberOfLines={2}>
    {item.description}
  </Text>
  <View style={styles.conseilFooter}>
    <Text style={styles.conseilPoints}>+{item.points} points</Text>
    <TouchableOpacity onPress={() => shareConseil(item)}>
      <MaterialIcons name="share" size={20} color="#2196F3" />
    </TouchableOpacity>
  </View>
</TouchableOpacity>
);
const renderQuizItem = ({ item }: { item: Quiz }) => (
  <TouchableOpacity
    style={[styles.quizCard, completedQuizzes.includes(item.id) && styles.completedQuiz]}
    onPress={() => {
      setSelectedQuiz(item);
      speak(item.question, 'fr-FR');
    }}
    disabled={completedQuizzes.includes(item.id)}
    activeOpacity={0.8}
  >
    <Text style={styles.quizQuestion}>{item.question}</Text>
    <View style={styles.quizOptions}>
      {item.options.map((option, index) => (
        <TouchableOpacity
          key={index}
          style={styles.quizOption}
          onPress={() => handleQuizAnswer(item, option)}
          disabled={completedQuizzes.includes(item.id)}
        >
          <Text style={styles.quizOptionText}>{option}</Text>
        </TouchableOpacity>
      ))}
    </View>
    <Text style={styles.quizPoints}>+{item.points} points</Text>
    {item.timeLimit && (
      <Text style={styles.quizTimeLimit}>Temps: {item.timeLimit}s</Text>
    )}
  </TouchableOpacity>
);

const renderBadgeItem = ({ item }: { item: Badge }) => (
  <View style={[styles.badgeCard, { backgroundColor: item.unlocked ? item.color : '#E0E0E0' }]}>
    <MaterialIcons name={item.icon as any} size={40} color={item.unlocked ? '#FFF' : '#757575'} />
    <Text style={[styles.badgeName, { color: item.unlocked ? '#FFF' : '#757575' }]}>
      {item.name}
    </Text>
    <Text style={[styles.badgeDescription, { color: item.unlocked ? '#FFF' : '#757575' }]}>
      {item.description}
    </Text>
    {item.unlocked && item.dateUnlocked && (
      <Text style={styles.badgeDate}>
        Débloqué le {new Date(item.dateUnlocked).toLocaleDateString('fr-FR')}
      </Text>
    )}
  </View>
);

const renderChallengeItem = ({ item }: { item: Challenge }) => (
  <View style={styles.challengeCard}>
    <Text style={styles.challengeTitle}>{item.title}</Text>
    <Text style={styles.challengeDescription}>{item.description}</Text>
    <Text style={styles.challengeProgress}>
      Progrès: {item.current}/{item.target}
    </Text>
    <Text style={styles.challengeReward}>Récompense: {item.reward} points</Text>
    <Text style={styles.challengeDeadline}>Échéance: {item.deadline}</Text>
  </View>
);
const renderProgress = () => (
  <View style={styles.progressContainer}>
    <Text style={styles.progressTitle}>Votre Progression</Text>
    <Text style={styles.progressText}>Points totaux: {userPoints}</Text>
    <Text style={styles.progressText}>Série de jours: {userProgress.streak}</Text>
    <Text style={styles.progressText}>Quiz complétés aujourd'hui: {userProgress.completedToday}</Text>
    <Text style={styles.progressText}>Objectif hebdomadaire: {userProgress.weeklyGoal} conseils</Text>
    <Text style={styles.progressTitle}>Statistiques Mensuelles</Text>
    {Object.entries(userProgress.monthlyStats).map(([date, count]) => (
      <Text key={date} style={styles.progressText}>
        {date}: {count} quiz complétés
      </Text>
    ))}
  </View>
);
const handleTabSwitch = (tab: 'conseils' | 'quiz' | 'badges' | 'progress' | 'challenges') => {
  setActiveTab(tab);
  Animated.timing(tabAnim, {
    toValue: ['conseils', 'quiz', 'badges', 'progress', 'challenges'].indexOf(tab) * (width / 5),
    duration: 300,
    useNativeDriver: true,
  }).start();
  speak(`Onglet ${tab} sélectionné`, 'fr-FR');
};

return (
  <View style={styles.container}>
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Yafa Santé</Text>
      <Text style={styles.points}>Points: {userPoints}</Text>
    </View>

    <View style={styles.searchContainer}>
      <TextInput
        style={styles.searchInput}
        placeholder="Rechercher conseils ou quiz..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      <TouchableOpacity onPress={startRecording} style={styles.micButton}>
        <MaterialIcons
          name={isRecording ? 'mic' : 'mic-off'}
          size={24}
          color={isRecording ? '#ff5252' : '#757575'}
        />
      </TouchableOpacity>
    </View>

    <View style={styles.filterContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <TouchableOpacity
          style={[styles.filterButton, selectedFilter === 'all' && styles.activeFilter]}
          onPress={() => setSelectedFilter('all')}
        >
          <Text style={styles.filterText}>Tous</Text>
        </TouchableOpacity>
        {[...new Set(conseils.map(c => c.disease))].map(disease => (
          <TouchableOpacity
            key={disease}
            style={[styles.filterButton, selectedFilter === disease && styles.activeFilter]}
            onPress={() => setSelectedFilter(disease as Disease)}
          >
            <Text style={styles.filterText}>{disease}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>

    <View style={styles.tabContainer}>
      {['conseils', 'quiz', 'badges', 'progress', 'challenges'].map(tab => (
        <TouchableOpacity
          key={tab}
          style={styles.tabButton}
          onPress={() => handleTabSwitch(tab as 'conseils' | 'quiz' | 'badges' | 'progress' | 'challenges')}
        >
          <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
      <Animated.View
        style={[
          styles.tabIndicator,
          { transform: [{ translateX: tabAnim }] },
        ]}
      />
    </View>
    <Animated.View style={[styles.contentContainer, { opacity: fadeAnim }]}>
      {loading && <ActivityIndicator size="large" color="#2196F3" />}
      {activeTab === 'conseils' && (
        <FlatList
          data={filteredConseils}
          renderItem={renderConseilItem}
          keyExtractor={item => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReached={loadMoreConseils}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={<Text style={styles.emptyText}>Aucun conseil trouvé.</Text>}
        />
      )}
      {activeTab === 'quiz' && (
        <FlatList
          data={filteredQuizzes}
          renderItem={renderQuizItem}
          keyExtractor={item => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReached={loadMoreQuizzes}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={<Text style={styles.emptyText}>Aucun quiz trouvé.</Text>}
        />
      )}
      {activeTab === 'badges' && (
        <FlatList
          data={badges}
          renderItem={renderBadgeItem}
          keyExtractor={item => item.id}
          numColumns={2}
          ListEmptyComponent={<Text style={styles.emptyText}>Aucun badge disponible.</Text>}
        />
      )}
      {activeTab === 'progress' && renderProgress()}
      {activeTab === 'challenges' && (
        <FlatList
          data={challenges}
          renderItem={renderChallengeItem}
          keyExtractor={item => item.id}
          ListEmptyComponent={<Text style={styles.emptyText}>Aucun défi disponible.</Text>}
        />
      )}
    </Animated.View>

    <Modal
      visible={showDetailsModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowDetailsModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          {selectedConseil && (
            <>
              <Text style={styles.modalTitle}>{selectedConseil.title}</Text>
              <Text style={styles.modalDescription}>{selectedConseil.description}</Text>
              {selectedConseil.tips && (
                <View style={styles.tipsContainer}>
                  <Text style={styles.tipsTitle}>Conseils Pratiques:</Text>
                  {selectedConseil.tips.map((tip, index) => (
                    <Text key={index} style={styles.tipText}>• {tip}</Text>
                  ))}
                </View>
              )}
              {selectedConseil.relatedLinks && (
                <View style={styles.linksContainer}>
                  <Text style={styles.linksTitle}>Liens Utiles:</Text>
                  {selectedConseil.relatedLinks.map((link, index) => (
                    <TouchableOpacity key={index} onPress={() => Linking.openURL(link)}>
                      <Text style={styles.linkText}>{link}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => {
                    shareConseil(selectedConseil);
                    setShowDetailsModal(false);
                  }}
                >
                  <Text style={styles.modalButtonText}>Partager</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => setShowDetailsModal(false)}
                >
                  <Text style={styles.modalButtonText}>Fermer</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  </View>
);
}

const styles = StyleSheet.create({
container: {
flex: 1,
backgroundColor: '#F5F5F5',
},
header: {
flexDirection: 'row',
justifyContent: 'space-between',
alignItems: 'center',
padding: 16,
backgroundColor: '#4CAF50',
},
headerTitle: {
fontSize: 24,
fontWeight: 'bold',
color: '#FFF',
},
points: {
fontSize: 18,
color: '#FFF',
},
searchContainer: {
flexDirection: 'row',
alignItems: 'center',
padding: 10,
backgroundColor: '#FFF',
marginHorizontal: 10,
borderRadius: 8,
marginVertical: 10,
},
searchInput: {
flex: 1,
fontSize: 16,
padding: 8,
},
micButton: {
padding: 8,
},
filterContainer: {
paddingHorizontal: 10,
marginBottom: 10,
},
filterButton: {
paddingVertical: 8,
paddingHorizontal: 16,
marginRight: 8,
backgroundColor: '#E0E0E0',
borderRadius: 20,
},
activeFilter: {
backgroundColor: '#4CAF50',
},
filterText: {
fontSize: 14,
color: '#000',
},
tabContainer: {
flexDirection: 'row',
justifyContent: 'space-around',
backgroundColor: '#FFF',
paddingVertical: 10,
},
tabButton: {
flex: 1,
alignItems: 'center',
paddingVertical: 10,
},
tabText: {
fontSize: 16,
color: '#757575',
},
activeTabText: {
color: '#4CAF50',
fontWeight: 'bold',
},
tabIndicator: {
position: 'absolute',
bottom: 0,
height: 3,
width: width / 5,
backgroundColor: 'green',
},
contentContainer: {
flex: 1,
paddingHorizontal: 10,
},
conseilCard: {
backgroundColor: '#FFF',
padding: 15,
marginVertical: 8,
borderRadius: 10,
shadowColor: '#000',
shadowOffset: { width: 0, height: 2 },
shadowOpacity: 0.1,
shadowRadius: 4,
elevation: 3,
},
conseilHeader: {
flexDirection: 'row',
justifyContent: 'space-between',
alignItems: 'center',
},
conseilTitle: {
fontSize: 18,
fontWeight: 'bold',
flex: 1,
},
conseilDescription: {
fontSize: 14,
color: '4CAF50  ',
marginVertical: 8,
},
conseilFooter: {
flexDirection: 'row',
justifyContent: 'space-between',
alignItems: 'center',
},
conseilPoints: {
fontSize: 14,
color: '#4CAF50',
},
quizCard: {
backgroundColor: '#FFF',
padding: 15,
marginVertical: 8,
borderRadius: 10,
shadowColor: '#000',
shadowOffset: { width: 0, height: 2 },
shadowOpacity: 0.1,
shadowRadius: 4,
elevation: 3,
},
completedQuiz: {
backgroundColor: '4CAF50  ',
opacity: 0.7,
},
quizQuestion: {
fontSize: 18,
fontWeight: 'bold',
marginBottom: 10,
},
quizOptions: {
marginVertical: 10,
},
quizOption: {
padding: 10,
backgroundColor: '#F5F5F5',
borderRadius: 5,
marginVertical: 5,
},
quizOptionText: {
fontSize: 16,
color: '#333',
},
quizPoints: {
fontSize: 14,
color: '#4CAF50',
marginTop: 10,
},
quizTimeLimit: {
fontSize: 14,
color: '#FF5252',
},
badgeCard: {
flex: 1,
margin: 8,
padding: 15,
borderRadius: 10,
alignItems: 'center',
justifyContent: 'center',
shadowColor: '#000',
shadowOffset: { width: 0, height: 2 },
shadowOpacity: 0.1,
shadowRadius: 4,
elevation: 3,
},
badgeName: {
fontSize: 16,
fontWeight: 'bold',
marginVertical: 8,
},
badgeDescription: {
fontSize: 14,
textAlign: 'center',
},
badgeDate: {
fontSize: 12,
color: '#FFF',
marginTop: 8,
},
challengeCard: {
backgroundColor: '#FFF',
padding: 15,
marginVertical: 8,
borderRadius: 10,
shadowColor: '#000',
shadowOffset: { width: 0, height: 2 },
shadowOpacity: 0.1,
shadowRadius: 4,
elevation: 3,
},
challengeTitle: {
fontSize: 18,
fontWeight: 'bold',
},
challengeDescription: {
fontSize: 14,
color: '#555',
marginVertical: 8,
},
challengeProgress: {
fontSize: 14,
color: '#2196F3',
},
challengeReward: {
fontSize: 14,
color: '#4CAF50',
},
challengeDeadline: {
fontSize: 14,
color: '#FF5252',
},
progressContainer: {
padding: 15,
backgroundColor: '#FFF',
borderRadius: 10,
margin: 10,
shadowColor: '#000',
shadowOffset: { width: 0, height: 2 },
shadowOpacity: 0.1,
shadowRadius: 4,
elevation: 3,
},
progressTitle: {
fontSize: 18,
fontWeight: 'bold',
marginBottom: 10,
},
progressText: {
fontSize: 16,
marginVertical: 5,
},
modalContainer: {
flex: 1,
justifyContent: 'center',
alignItems: 'center',
backgroundColor: 'rgba(0, 0, 0, 0.5)',
},
modalContent: {
backgroundColor: '#FFF',
padding: 20,
borderRadius: 10,
width: '90%',
maxHeight: '80%',
},
modalTitle: {
fontSize: 20,
fontWeight: 'bold',
marginBottom: 10,
},
modalDescription: {
fontSize: 16,
color: '#555',
marginBottom: 10,
},
tipsContainer: {
marginVertical: 10,
},
tipsTitle: {
fontSize: 16,
fontWeight: 'bold',
marginBottom: 5,
},
tipText: {
fontSize: 14,
color: '#333',
marginVertical: 2,
},
linksContainer: {
marginVertical: 10,
},
linksTitle: {
fontSize: 16,
fontWeight: 'bold',
marginBottom: 5,
},
linkText: {
fontSize: 14,
color: '#2196F3',
marginVertical: 2,
},
modalButtons: {
flexDirection: 'row',
justifyContent: 'space-around',
marginTop: 20,
},
modalButton: {
padding: 10,
backgroundColor: '#2196F0',
borderRadius: 5,
},
modalButtonText: {
color: '#FFF',
fontSize: 16,
},
emptyText: {
fontSize: 16,
color: '#757575',
textAlign: 'center',
marginTop: 20,
},
});