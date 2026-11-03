export const TUNISIA_GOVERNORATES: Record<string, string[]> = {
  'Tunis': [
    'Tunis', 'Bab Bhar', 'Bab Souika', 'Carthage', 'Djedeida', 'El Menzah', 'El Omrane', 
    'El Ouardia', 'Ettahrir', 'Halk El Oued', 'Helal', 'La Goulette', 'La Marsa', 'Le Bardo',
    'Le Kram', 'Medina', 'Omrane Supérieur', 'Sidi El Bechir', 'Sidi Hassine', 'Sijoumi'
  ],
  'Ariana': [
    'Ariana', 'Cité El Khadra', 'El Mnihla', 'Ettadhamen', 'Kalâat El Andalous', 'La Soukra',
    'Mnihla', 'Raoued', 'Sidi Thabet', 'Soukra'
  ],
  'Ben Arous': [
    'Ben Arous', 'Boumhel', 'El Mourouj', 'Ezzahra', 'Fouchana', 'Hammam Chott', 'Hammam Lif',
    'Mégrine', 'Mohamedia', 'Mornag', 'Radès', 'Tebourba'
  ],
  'Manouba': [
    'Manouba', 'Borj El Amri', 'Djedeida', 'Douar Hicher', 'El Battan', 'Mornaguia', 'Oued Ellil',
    'Tebourba'
  ],
  'Nabeul': [
    'Nabeul', 'Beni Khalled', 'Beni Khiar', 'Bou Argoub', 'Dar Chaabane', 'El Haouaria',
    'El Mida', 'Grombalia', 'Hammamet', 'Kelibia', 'Korba', 'Menzel Bouzelfa', 'Menzel Temime',
    'Soliman', 'Takelsa', 'Zaouiet Djedidi'
  ],
  'Zaghouan': [
    'Zaghouan', 'Bir Mcherga', 'El Fahs', 'Nadhour', 'Saouaf', 'Zriba'
  ],
  'Bizerte': [
    'Bizerte', 'Aousja', 'Djoumina', 'El Alia', 'Ghar El Melh', 'Joumine', 'Mateur', 'Menzel Abderrahmane',
    'Menzel Bourguiba', 'Raf Raf', 'Ras Jebel', 'Sejnane', 'Tinaja', 'Utique', 'Zarzouna'
  ],
  'Béja': [
    'Béja', 'Amdoun', 'Goubellat', 'Medjez El Bab', 'Nefza', 'Téboursouk', 'Testour', 'Thibar'
  ],
  'Jendouba': [
    'Jendouba', 'Aïn Draham', 'Balta-Bou Aouane', 'Bou Salem', 'Fernana', 'Ghardimaou', 'Oued Mliz',
    'Tabarka'
  ],
  'Le Kef': [
    'Le Kef', 'Dahmani', 'Jerissa', 'Kalaat Senan', 'Kalaat Khasba', 'Nebeur', 'Sakiet Sidi Youssef',
    'Tajerouine'
  ],
  'Siliana': [
    'Siliana', 'Bou Arada', 'Bou Rouis', 'Gaâfour', 'Kesra', 'Makthar', 'Rouhia', 'Sbiba'
  ],
  'Kairouan': [
    'Kairouan', 'Bou Hajla', 'Chrarda', 'El Ala', 'Haffouz', 'Hajeb El Ayoun', 'Nasrallah', 'Oueslatia',
    'Sbikha', 'Sidi Abid'
  ],
  'Kasserine': [
    'Kasserine', 'Ezzouhour', 'Fériana', 'Foussana', 'Haidra', 'Jedeliane', 'Majel Bel Abbès',
    'Sbiba', 'Sbeitla', 'Thala'
  ],
  'Sidi Bouzid': [
    'Sidi Bouzid', 'Bir El Hafey', 'Cebbala Ouled Asker', 'Jilma', 'Mazzouna', 'Meknassy', 'Menzel Bouzaiane',
    'Ouled Haffouz', 'Regueb', 'Sidi Ali Ben Aoun'
  ],
  'Sfax': [
    'Sfax', 'Agareb', 'Bir Ali Ben Khelifa', 'El Amra', 'El Hencha', 'Graïba', 'Jebiniana', 'Kerkennah',
    'Mahres', 'Menzel Chaker', 'Oued Ellil', 'Sakiet Eddaïer', 'Sakiet Ezzit', 'Skhira', 'Thyna'
  ],
  'Gabès': [
    'Gabès', 'Chenini Nahal', 'El Hamma', 'El Hamma Ouest', 'Ghannouch', 'Mareth', 'Matmata', 'Matmata Nouvelles',
    'Métouia', 'Nouvelle Matmata', 'Oudhref'
  ],
  'Medenine': [
    'Medenine', 'Beni Khedache', 'Bou Grara', 'Djerba Ajim', 'Djerba Houmt Souk', 'Djerba Midoun',
    'El Kantara', 'Sidi Makhlouf', 'Zarzis'
  ],
  'Tataouine': [
    'Tataouine', 'Bir Lahmar', 'Dehiba', 'Ghomrassen', 'Remada', 'Smâr'
  ],
  'Gafsa': [
    'Gafsa', 'Belkhir', 'El Guettar', 'El Ksar', 'Mdhilla', 'Métlaoui', 'Moularès', 'Redeyef', 'Sned'
  ],
  'Tozeur': [
    'Tozeur', 'Degache', 'Hazoua', 'Nefta', 'Tameghza'
  ],
  'Kebili': [
    'Kebili', 'Douz', 'El Goléa', 'Faouar', 'Jemna', 'Nefzaoua', 'Souk Lahad'
  ],
};

export const GOVERNORATE_LIST = Object.keys(TUNISIA_GOVERNORATES).sort();

export function getDelegations(governorate: string): string[] {
  return TUNISIA_GOVERNORATES[governorate] || [];
}