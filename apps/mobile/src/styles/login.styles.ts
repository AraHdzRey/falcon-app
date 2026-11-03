import { StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';

export const loginStyles = StyleSheet.create({
  buildingImage: {
    width: '100%',
    maxWidth: 420,
    height: 180,
    borderRadius: 8,
    marginBottom: 24,
  },

  hero: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#950A0B',
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingTop: 18,
    alignItems: 'center',
    marginBottom: 24,
  },

  container: {
    flexGrow: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  brand: {
    fontSize: 30,
    fontFamily: 'Montserrat_700Bold',
    color: '#FFFFFF',
    letterSpacing: 5,
    textAlign: 'center',
    marginBottom: 18,
  },

  title: {
    fontSize: 26,
    fontFamily: 'Montserrat_700Bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 16,
  },

  description: {
    fontSize: 16,
    fontFamily: 'Montserrat_400Regular',
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },

  formField: {
    width: '100%',
    maxWidth: 420,
    marginTop: 28,
  },

  label: {
    fontSize: 14,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#2E2F32',
    marginBottom: 8,
  },

  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: 'Montserrat_400Regular',
    color: '#2E2F32',
  },

  passwordField: {
    width: '100%',
    maxWidth: 420,
    marginTop: 16,
  },

  passwordRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },

  passwordInput: {
    flex: 1,
    minWidth: 0,
    height: 50,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: 'Montserrat_400Regular',
    color: '#2E2F32',
  },

  eyeButton: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loginButton: {
    width: '100%',
    maxWidth: 420,
    minHeight: 52,
    backgroundColor: '#F9001D',
    borderRadius: 10,
    marginTop: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },

  loginButtonText: {
    fontSize: 16,
    fontFamily: 'Montserrat_700Bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },

  loginNotice: {
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
    color: '#2E2F32',
    textAlign: 'center',
    marginTop: 10,
  },

  rememberRow: {
    width: '100%',
    maxWidth: 420,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    gap: 10,
  },

  rememberText: {
    fontSize: 13,
    fontFamily: 'Montserrat_400Regular',
    color: '#2E2F32',
  },

  forgotPasswordRow: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'flex-end',
    marginTop: 12,
  },

  forgotPasswordText: {
    fontSize: 13,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#950A0B',
    textDecorationLine: 'underline',
  },

  desktopContainer: {
    paddingHorizontal: 48,
  },

  desktopCard: {
    width: '100%',
    maxWidth: 1200,
    minHeight: 650,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
  },

  desktopBrandPanel: {
    width: '44%',
    minWidth: 0,
    minHeight: 650,
    backgroundColor: '#950A0B',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
  },

  desktopFormPanel: {
    flex: 56,
    minWidth: 0,
    minHeight: 650,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },

  desktopBuildingImage: {
    width: '100%',
    height: 260,
    borderRadius: 8,
    marginBottom: 0,
  },

  desktopSlogan: {
    fontSize: 15,
    fontFamily: 'Montserrat_400Regular',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 18,
  },

  desktopDescription: {
    width: '100%',
    maxWidth: 420,
    textAlign: 'left',
  },

  desktopTitle: {
    width: '100%',
    maxWidth: 420,
    textAlign: 'left',
  },

  desktopOptionsRow: {
    width: '100%',
    maxWidth: 420,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

});