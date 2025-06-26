import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Linking,
  Modal,
  RefreshControl,
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
  disease: 'diabete' | 'hypertension' | 'vih' | 'general';
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
  disease: 'diabete' | 'hypertension' | 'vih' | 'general';
  explanation: string;
  points: number;
  timeLimit?: number;
};

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
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'diabete' | 'hypertension' | 'vih' | 'general'>('all');
  const [fadeAnim] = useState(new Animated.Value(1));
  const [tabAnim] = useState(new Animated.Value(0));
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedConseil, setSelectedConseil] = useState<Conseil | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pageConseils, setPageConseils] = useState(1);
  const [pageQuizzes, setPageQuizzes] = useState(1);
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

  // Simuler la récupération de données depuis Internet
  const fetchConseils = async (page: number): Promise<Conseil[]> => {
    setLoading(true);
    try {
      // Simulation d'une requête API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Liste de conseils variés
      const conseilPool: Conseil[] = [
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
          disease: 'hypertension',
          title: '🚴‍♀️ Vélo pour la tension',
          description: 'Le vélo régulier réduit la pression artérielle et améliore la santé cardiaque.',
          points: 15,
          tips: ['Faites 30 minutes 3 fois par semaine', 'Choisissez un terrain plat', 'Portez un casque'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.who.int/fr'],
        },
        {
          id: `conseil-${Date.now()}-${page}-3`,
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
          id: `conseil-${Date.now()}-${page}-4`,
          category: 'prevention',
          disease: 'general',
          title: '🧴 Protection solaire',
          description: 'Utilisez une crème solaire pour protéger votre peau des rayons UV.',
          points: 5,
          tips: ['Appliquez toutes les 2 heures', 'Portez un chapeau', 'Évitez le soleil entre 12h et 16h'],
          dateAdded: new Date().toISOString().split('T')[0],
          relatedLinks: ['https://www.santepubliquefrance.fr'],
        },
      ];

      // Filtrer les conseils déjà présents pour éviter les doublons
      const existingIds = conseils.map(c => c.id);
      const newConseils = conseilPool.filter(c => !existingIds.includes(c.id));

      // Si c'est la première page, réinitialiser les conseils, sinon ajouter
      const updatedConseils = page === 1 ? newConseils : [...conseils, ...newConseils];

      // Stocker en local pour mode hors-ligne
      await AsyncStorage.setItem('cachedConseils', JSON.stringify(updatedConseils));
      return updatedConseils;
    } catch (error) {
      console.error('Erreur récupération conseils:', error);
      // Charger les données locales en cas d'erreur
      const cached = await AsyncStorage.getItem('cachedConseils');
      return cached ? JSON.parse(cached) : [];
    } finally {
      setLoading(false);
    }
  };

  const fetchQuizzes = async (page: number): Promise<Quiz[]> => {
    setLoading(true);
    try {
      // Simulation d'une requête API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Liste de quiz variés
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
      ];

      // Filtrer les quiz déjà présents pour éviter les doublons
      const existingIds = quizzes.map(q => q.id);
      const newQuizzes = quizPool.filter(q => !existingIds.includes(q.id));

      // Si c'est la première page, réinitialiser les quiz, sinon ajouter
      const updatedQuizzes = page === 1 ? newQuizzes : [...quizzes, ...newQuizzes];

      // Stocker en local pour mode hors-ligne
      await AsyncStorage.setItem('cachedQuizzes', JSON.stringify(updatedQuizzes));
      return updatedQuizzes;
    } catch (error) {
      console.error('Erreur récupération quiz:', error);
      // Charger les données locales en cas d'erreur
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

  useEffect(() => {
    loadProgress();
    updateStreak();
    fetchInitialData();
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
              setPageQuizzes(1); // Réinitialiser la page pour un nouveau lot
              const newQuizzes = await fetchQuizzes(1);
              setQuizzes(newQuizzes);
              setCompletedQuizzes([]); // Réinitialiser les quiz complétés
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
    setCompletedQuizzes([]); // Réinitialiser les quiz complétés
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
      if (newConseils.length === conseils

.length) {
        Alert.alert('Aucun conseil supplémentaire', 'Tous les conseils disponibles ont été chargés.');
      } else {
        setConseils(newConseils);
        speak('Conseils chargés', 'fr-FR');
      }
    }
  };

  const loadMoreQuizzes = async () => {
    if (!loading) {
      const nextPage = pageQuizzes + 1;
      setPageQuizzes(nextPage);
      const newQuizzes = await fetchQuizzes(nextPage);
      if (newQuizzes.length === quizzes.length) {
        Alert.alert('Aucun quiz supplémentaire', 'Tous les quiz disponibles ont été chargés.');
      } else {
        setQuizzes(newQuizzes);
        speak('Quiz chargés', 'fr-FR');
      }
    }
  };

  const getFilteredConseils = () => {
    return conseils
      .filter(conseil => {
        const matchesSearch =
          conseil.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          conseil.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = selectedFilter === 'all' || conseil.disease === selectedFilter;
        return matchesSearch && matchesFilter;
      })
      .slice(0, pageConseils * itemsPerPage);
  };

  const getFilteredQuizzes = () => {
    return quizzes
      .filter(quiz => {
        const matchesFilter = selectedFilter === 'all' || quiz.disease === selectedFilter;
        return matchesFilter;
      })
      .slice(0, pageQuizzes * itemsPerPage);
  };

  const getDiseaseColor = (disease: 'diabete' | 'hypertension' | 'vih' | 'general') => {
    const colors: Record<'diabete' | 'hypertension' | 'vih' | 'general', string> = {
      diabete: '#2196F3',
      hypertension: '#E91E63',
      vih: '#FF9800',
      general: '#4CAF50',
    };
    return colors[disease] || '#666';
  };

  const getDiseaseBackground = (disease: 'diabete' | 'hypertension' | 'vih' | 'general') => {
    const backgrounds: Record<'diabete' | 'hypertension' | 'vih' | 'general', string> = {
      diabete: '#E3F2FD',
      hypertension: '#FCE4EC',
      vih: '#FFF3E0',
      general: '#E8F5E8',
    };
    return backgrounds[disease] || '#F5F5F5';
  };

  const renderTabButton = (tab: 'conseils' | 'quiz' | 'badges' | 'progress' | 'challenges', title: string, icon: string) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tab && styles.activeTab]}
      onPress={() => {
        setActiveTab(tab);
        Animated.timing(tabAnim, {
          toValue: tab === 'conseils' ? 0 : tab === 'quiz' ? 1 : tab === 'badges' ? 2 : tab === 'progress' ? 3 : 4,
          duration: 300,
          useNativeDriver: true,
        }).start();
        speak(`Onglet ${title} sélectionné`, 'fr-FR');
      }}
      onLongPress={() => speak(title, 'fr-FR')}
      accessibilityLabel={title}
      accessibilityHint={`Appuyez pour ouvrir l'onglet ${title}`}
    >
      <MaterialIcons name={icon as any} size={18} color={activeTab === tab ? '#FFF' : '#666'} />
      <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{title}</Text>
    </TouchableOpacity>
  );

  const renderConseil = ({ item }: { item: Conseil }) => (
    <TouchableOpacity
      style={[styles.conseilItem, { backgroundColor: getDiseaseBackground(item.disease) }]}
      onPress={() => {
        setSelectedConseil(item);
        setShowDetailsModal(true);
        speak(item.description, 'fr-FR');
      }}
      onLongPress={() => speak(`${item.title}. ${item.description}`, 'fr-FR')}
      accessibilityLabel={item.title}
      accessibilityHint="Appuyez pour voir les détails du conseil"
    >
      <View style={styles.conseilContent}>
        <MaterialIcons
          name={item.category === 'nutrition' ? 'restaurant' : item.category === 'activite' ? 'directions-walk' : item.category === 'education' ? 'info' : 'health-and-safety'}
          size={32}
          color={getDiseaseColor(item.disease)}
        />
        <View style={styles.conseilText}>
          <Text style={styles.conseilTitle}>{item.title}</Text>
          <Text style={styles.conseilDescription} numberOfLines={2}>{item.description}</Text>
          <Text style={styles.conseilMeta}>{item.points} pts</Text>
        </View>
        <TouchableOpacity
          onPress={() => toggleFavorite(item.id)}
          accessibilityLabel={favoriteConseils.includes(item.id) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          <MaterialIcons
            name={favoriteConseils.includes(item.id) ? 'favorite' : 'favorite-border'}
            size={24}
            color={favoriteConseils.includes(item.id) ? '#F44336' : '#666'}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderQuiz = ({ item }: { item: Quiz }) => (
    <Animated.View style={[styles.quizItem, { opacity: fadeAnim }]}>
      <Text style={styles.quizQuestion}>{item.question}</Text>
      {item.options.map(option => (
        <TouchableOpacity
          key={option}
          style={[styles.quizOption, completedQuizzes.includes(item.id) && styles.quizOptionDisabled]}
          onPress={() => handleQuizAnswer(item, option)}
          onLongPress={() => speak(option, 'fr-FR')}
          disabled={completedQuizzes.includes(item.id)}
        >
          <Text style={styles.quizOptionText}>{option}</Text>
        </TouchableOpacity>
      ))}
      {completedQuizzes.includes(item.id) && <Text style={styles.quizCompleted}>Quiz complété !</Text>}
    </Animated.View>
  );

  const renderBadge = ({ item }: { item: Badge }) => (
    <View style={[styles.badgeItem, { backgroundColor: item.unlocked ? item.color : '#E0E0E0' }]}>
      <MaterialIcons name={item.icon as any} size={40} color={item.unlocked ? '#FFF' : '#666'} />
      <Text style={[styles.badgeName, { color: item.unlocked ? '#FFF' : '#666' }]}>{item.name}</Text>
      <Text style={[styles.badgeDescription, { color: item.unlocked ? '#FFF' : '#666' }]}>{item.description}</Text>
      <Text style={[styles.badgeStatus, { color: item.unlocked ? '#FFF' : '#666' }]}>
        {item.unlocked ? `Débloqué le ${item.dateUnlocked?.split('T')[0]}` : `${item.requiredPoints} points requis`}
      </Text>
    </View>
  );

  const renderProgress = () => (
    <View style={styles.progressContainer}>
      <Text style={styles.sectionTitle}>Votre Progression</Text>
      <View style={styles.progressItem}>
        <Text style={styles.progressLabel}>Série de jours : </Text>
        <Text style={styles.progressValue}>{userProgress.streak} jours</Text>
      </View>
      <View style={styles.progressItem}>
        <Text style={styles.progressLabel}>Quiz complétés aujourd'hui : </Text>
        <Text style={styles.progressValue}>{userProgress.completedToday}</Text>
      </View>
      <View style={styles.progressItem}>
        <Text style={styles.progressLabel}>Objectif hebdomadaire : </Text>
        <Text style={styles.progressValue}>{userProgress.completedToday}/{userProgress.weeklyGoal} quiz</Text>
      </View>
      <View style={styles.progressItem}>
        <Text style={styles.progressLabel}>Points totaux : </Text>
        <Text style={styles.progressValue}>{userPoints} points</Text>
      </View>
    </View>
  );

  const renderChallenge = ({ item }: { item: Challenge }) => (
    <View style={styles.challengeItem}>
      <Text style={styles.challengeTitle}>{item.title}</Text>
      <Text style={styles.challengeDescription}>{item.description}</Text>
      <Text style={styles.challengeProgress}>Progrès : {item.current}/{item.target}</Text>
      <Text style={styles.challengeReward}>Récompense : {item.reward} points</Text>
      <Text style={styles.challengeDeadline}>Échéance : {item.deadline}</Text>
    </View>
  );

  const renderModal = () => (
    <Modal visible={showDetailsModal} transparent animationType="slide" onRequestClose={() => setShowDetailsModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {selectedConseil && (
            <>
              <Text style={styles.modalTitle}>{selectedConseil.title}</Text>
              <Text style={styles.modalDescription}>{selectedConseil.description}</Text>
              <Text style={styles.modalMeta}>{selectedConseil.points} points</Text>
              {selectedConseil.tips && (
                <View style={styles.modalTips}>
                  <Text style={styles.modalTipsTitle}>Conseils pratiques :</Text>
                  {selectedConseil.tips.map((tip, index) => (
                    <Text key={index} style={styles.modalTipItem}>• {tip}</Text>
                  ))}
                </View>
              )}
              {selectedConseil.relatedLinks && selectedConseil.relatedLinks.length > 0 && (
                <View style={styles.modalLinks}>
                  <Text style={styles.modalTipsTitle}>Liens utiles :</Text>
                  {selectedConseil.relatedLinks.map((link, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => Linking.openURL(link).catch(() => Alert.alert('Erreur', 'Impossible d’ouvrir le lien'))}
                      onLongPress={() => speak(`Ouvrir le lien ${link}`, 'fr-FR')}
                      accessibilityLabel={`Lien vers ${link}`}
                    >
                      <Text style={styles.modalLinkItem}>{link}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalButton} onPress={() => shareConseil(selectedConseil)}>
                  <MaterialIcons name="share" size={20} color="#FFF" />
                  <Text style={styles.modalButtonText}>Partager</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => {
                    toggleFavorite(selectedConseil.id);
                    setShowDetailsModal(false);
                  }}
                >
                  <MaterialIcons
                    name={favoriteConseils.includes(selectedConseil.id) ? 'favorite' : 'favorite-border'}
                    size={20}
                    color="#FFF"
                  />
                  <Text style={styles.modalButtonText}>
                    {favoriteConseils.includes(selectedConseil.id) ? 'Retirer' : 'Ajouter aux favoris'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: '#F44336' }]}
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
  );

  return (
    <View style={styles.container}>
      {/* En-tête */}
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerText}>Yafa Conseils Santé</Text>
        </View>
      
      </View>

      {/* Barre de recherche et filtres */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Rechercher un conseil..."
          accessibilityLabel="Rechercher un conseil"
          accessibilityHint="Entrez un mot-clé pour filtrer les conseils"
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          {['all', 'diabete', 'hypertension', 'vih', 'general'].map(filter => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterButton, selectedFilter === filter && styles.activeFilter]}
              onPress={() => setSelectedFilter(filter as any)}
              onLongPress={() => speak(filter === 'all' ? 'Tous' : filter.charAt(0).toUpperCase() + filter.slice(1), 'fr-FR')}
              accessibilityLabel={filter === 'all' ? 'Tous' : filter.charAt(0).toUpperCase() + filter.slice(1)}
            >
              <Text style={[styles.filterText, selectedFilter === filter && styles.activeFilterText]}>
                {filter === 'all' ? 'Tous' : filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Onglets */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabContainer}>
        {renderTabButton('conseils', 'Conseils', 'restaurant')}
        {renderTabButton('quiz', 'Quiz', 'help')}
        {renderTabButton('badges', 'Badges', 'emoji-events')}
        {renderTabButton('progress', 'Progrès', 'trending-up')}
        {renderTabButton('challenges', 'Défis', 'star')}
      </ScrollView>

      {/* Contenu */}
      <Animated.View style={[styles.content, { opacity: tabAnim.interpolate({ inputRange: [0, 4], outputRange: [1, 0.8] }) }]}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingText}>Chargement des données...</Text>
          </View>
        ) : (
          <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
            {activeTab === 'conseils' && (
              <FlatList
                data={getFilteredConseils()}
                renderItem={renderConseil}
                keyExtractor={item => item.id}
                ListHeaderComponent={
                  <View style={styles.statsContainer}>
                    <Text style={styles.statsText}>Points : {userPoints}</Text>
                    <Text style={styles.statsText}>Favoris : {favoriteConseils.length}</Text>
                  </View>
                }
                ListFooterComponent={
                  <TouchableOpacity style={styles.loadMoreButton} onPress={loadMoreConseils} disabled={loading}>
                    <Text style={styles.loadMoreText}>Charger plus de conseils</Text>
                  </TouchableOpacity>
                }
                ListEmptyComponent={<Text style={styles.emptyText}>Aucun conseil trouvé.</Text>}
              />
            )}
            {activeTab === 'quiz' && (
              <FlatList
                data={getFilteredQuizzes()}
                renderItem={renderQuiz}
                keyExtractor={item => item.id}
                ListHeaderComponent={
                  <View style={styles.statsContainer}>
                    <Text style={styles.statsText}>Quiz complétés : {completedQuizzes.length}</Text>
                  </View>
                }
                ListFooterComponent={
                  quizzes.every(quiz => completedQuizzes.includes(quiz.id)) ? (
                    <TouchableOpacity style={styles.loadMoreButton} onPress={loadMoreQuizzes} disabled={loading}>
                      <Text style={styles.loadMoreText}>Charger plus de quiz</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.loadMoreButton} onPress={loadMoreQuizzes} disabled={loading}>
                      <Text style={styles.loadMoreText}>Charger plus de quiz</Text>
                    </TouchableOpacity>
                  )
                }
                ListEmptyComponent={<Text style={styles.emptyText}>Aucun quiz trouvé.</Text>}
              />
            )}
            {activeTab === 'badges' && (
              <FlatList
                data={badges}
                renderItem={renderBadge}
                keyExtractor={item => item.id}
                numColumns={2}
                ListHeaderComponent={
                  <View style={styles.statsContainer}>
                    <Text style={styles.statsText}>Badges débloqués : {badges.filter(b => b.unlocked).length}</Text>
                  </View>
                }
              />
            )}
            {activeTab === 'progress' && renderProgress()}
            {activeTab === 'challenges' && (
              <FlatList
                data={challenges}
                renderItem={renderChallenge}
                keyExtractor={item => item.id}
                ListHeaderComponent={
                  <View style={styles.statsContainer}>
                    <Text style={styles.statsText}>Défis en cours : {challenges.length}</Text>
                  </View>
                }
              />
            )}
          </ScrollView>
        )}
      </Animated.View>

      {/* Modal pour détails du conseil */}
      {renderModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#4CAF50',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerText: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#FFF',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  searchInput: {
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  filterContainer: {
    flexGrow: 0,
    marginBottom: 8,
  },
  filterButton: {
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    padding: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  activeFilter: {
    backgroundColor: '#4CAF50',
  },
  filterText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '500',
  },
  activeFilterText: {
    color: '#FFF',
  },
  tabContainer: {
    flexGrow: 0,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  activeTab: {
    backgroundColor: '#4CAF50',
  },
  tabText: {
    color: '#666',
    fontSize: 14,
    marginLeft: 4,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#FFF',
  },
  content: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  statsText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  conseilItem: {
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  conseilContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  conseilText: {
    flex: 1,
    marginLeft: 12,
  },
  conseilTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  conseilDescription: {
    fontSize: 14,
    color: '#666',
  },
  conseilMeta: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  quizItem: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  quizQuestion: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  quizOption: {
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  quizOptionDisabled: {
    backgroundColor: '#E0E0E0',
    opacity: 0.6,
  },
  quizOptionText: {
    fontSize: 14,
    color: '#333',
  },
  quizCompleted: {
    fontSize: 14,
    color: '#4CAF50',
    textAlign: 'center',
    marginTop: 8,
  },
  badgeItem: {
    flex: 1,
    margin: 8,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  badgeName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
  },
  badgeDescription: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  badgeStatus: {
    fontSize: 12,
    marginTop: 4,
  },
  progressContainer: {
    padding: 16,
  },
  progressItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 16,
    color: '#333',
  },
  progressValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  challengeItem: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  challengeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  challengeDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  challengeProgress: {
    fontSize: 14,
    color: '#4CAF50',
    marginBottom: 4,
  },
  challengeReward: {
    fontSize: 14,
    color: '#FF9800',
    marginBottom: 4,
  },
  challengeDeadline: {
    fontSize: 12,
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    width: width * 0.9,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  modalMeta: {
    fontSize: 14,
    color: '#999',
    marginBottom: 12,
  },
  modalTips: {
    marginBottom: 12,
  },
  modalTipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  modalTipItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  modalLinks: {
    marginBottom: 12,
  },
  modalLinkItem: {
    fontSize: 14,
    color: '#2196F3',
    textDecorationLine: 'underline',
    marginBottom: 4,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 10,
  },
  modalButtonText: {
    color: '#FFF',
    fontSize: 14,
    marginLeft: 4,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#333',
    marginTop: 10,
  },
  loadMoreButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 12,
    margin: 16,
    alignItems: 'center',
  },
  loadMoreText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});