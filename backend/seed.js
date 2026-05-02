const Brand = require('./models/Brand');

const defaultBrands = [
  'Nike',
  'Adidas',
  'Puma',
  'Reebok',
  'New Balance',
  'Converse',
  'Vans',
  'Skechers',
  'ASICS',
  'Under Armour',
  'Fila',
  'Jordan',
  'Crocs',
  'Birkenstock',
  'Timberland',
  'Dr. Martens',
  'Clarks',
  'Bata',
  'Woodland',
  'Red Tape',
  'Sparx',
  'Campus',
  'Lancer',
  'Liberty',
];

const seedDefaultBrands = async () => {
  try {
    const count = await Brand.countDocuments();
    if (count === 0) {
      const brands = defaultBrands.map(name => ({
        name,
        isCustom: false,
      }));
      await Brand.insertMany(brands);
      console.log(`🏷️  Seeded ${brands.length} default brands`);
    }
  } catch (error) {
    console.error('Error seeding brands:', error.message);
  }
};

module.exports = { seedDefaultBrands };
