import {
  calculateRecommendedMacros,
  UserProfile,
  validateUserProfile,
} from '../services/profile.service';

describe('Cálculo de macros recomendados', () => {
  const baseProfile: UserProfile = {
    weight: 75,
    height: 175,
    age: 30,
    gender: 'male',
    activityLevel: 'moderate',
    goal: 'maintain',
  };

  it('aplica Mifflin-St Jeor y reparte macros sin un ajuste de objetivo', () => {
    expect(calculateRecommendedMacros(baseProfile)).toEqual({
      calories: 2633,
      protein: 105,
      carbs: 389,
      fat: 73,
      fiber: 25,
      bmr: 1699,
      tdee: 2633,
      method: 'Mifflin-St Jeor',
      proteinPerKg: 1.4,
      referenceWeight: 75,
      calorieAdjustmentPercent: 0,
      calorieFloorApplied: false,
    });
  });

  it('usa un déficit porcentual y sube la proteína al perder peso', () => {
    const result = calculateRecommendedMacros({ ...baseProfile, goal: 'lose' });

    expect(result).toMatchObject({
      calories: 2238,
      protein: 135,
      carbs: 285,
      fat: 62,
      calorieAdjustmentPercent: -15,
      proteinPerKg: 1.8,
    });
  });

  it('usa peso ajustado con IMC alto y nunca devuelve macros negativos', () => {
    const result = calculateRecommendedMacros({
      weight: 150,
      height: 170,
      age: 40,
      gender: 'female',
      activityLevel: 'sedentary',
      goal: 'lose',
    });

    expect(result).not.toBeNull();
    expect(result!.referenceWeight).toBeCloseTo(103.4, 1);
    expect(result!.referenceWeight).toBeLessThan(150);
    expect(result!.protein).toBeGreaterThan(0);
    expect(result!.carbs).toBeGreaterThanOrEqual(0);
    expect(result!.fat).toBeGreaterThan(0);
  });

  it('requiere actividad y objetivo para el cálculo automático', () => {
    expect(calculateRecommendedMacros({ ...baseProfile, activityLevel: undefined })).toBeNull();
    expect(calculateRecommendedMacros({ ...baseProfile, goal: undefined })).toBeNull();
  });

  it('respeta valores personalizados iguales a cero y conserva BMR/TDEE reales', () => {
    const result = calculateRecommendedMacros({
      ...baseProfile,
      customCalories: 2000,
      customProtein: 0,
      customCarbs: 0,
      customFat: 0,
      customFiber: 31,
    });

    expect(result).toMatchObject({
      calories: 2000,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 31,
      bmr: 1699,
      tdee: 2633,
    });
  });
});

describe('Validación del perfil para macros', () => {
  it.each([
    [{ age: 17 }, 'age'],
    [{ weight: -1 }, 'weight'],
    [{ height: 300 }, 'height'],
    [{ customCalories: 500 }, 'customCalories'],
    [{ customFiber: 201 }, 'customFiber'],
    [{ gender: 'other' as never }, 'gender'],
    [{ activityLevel: 'unknown' as never }, 'activityLevel'],
    [{ goal: 'unknown' as never }, 'goal'],
  ])('rechaza %o', (profile, field) => {
    expect(() => validateUserProfile(profile)).toThrow(
      expect.objectContaining({ httpCode: 400, message: expect.stringContaining(field) })
    );
  });

  it('acepta null para borrar macros personalizados', () => {
    expect(() => validateUserProfile({
      customCalories: null,
      customProtein: null,
      customCarbs: null,
      customFat: null,
      customFiber: null,
    })).not.toThrow();
  });
});
