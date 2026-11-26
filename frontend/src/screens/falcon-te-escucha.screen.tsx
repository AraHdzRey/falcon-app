import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  createComplaint,
  fetchAdminComplaintById,
  fetchAdminComplaints,
  fetchComplaintCategories,
  fetchMyComplaints,
  requestComplaintPdfTicket,
  trackComplaintByFolio,
  updateAdminComplaint,
  type FalconUser,
} from '../api/client';
import { COLORS } from '../constants/colors';
import {
  COMPLAINT_DESCRIPTION_MAX_LENGTH,
  COMPLAINT_NOTE_MAX_LENGTH,
  COMPLAINT_SEVERITY_OPTIONS,
  COMPLAINT_STATUS_OPTIONS,
  COMPLAINT_SUBJECT_MAX_LENGTH,
  COMPLAINT_TYPE_OPTIONS,
  DEFAULT_COMPLAINT_CATEGORIES,
  getComplaintSeverityLabel,
  getComplaintStatusLabel,
  getComplaintTypeLabel,
  getSeverityBadgePalette,
  getStatusBadgePalette,
  validateComplaintForm,
  type AdminComplaintFilters,
  type ComplaintCategory,
  type ComplaintRecord,
  type ComplaintSeverity,
  type ComplaintStatusCode,
  type ComplaintsSummary,
  type ComplaintTrackingResult,
  type ComplaintType,
  type CreatedComplaintSummary,
} from '../features/complaints/model';
import { formatNewsDate } from '../features/news/date';

type TabKey = 'bandeja' | 'nuevo' | 'mis-casos';

interface CheckboxOption<T extends string> {
  value: T;
  label: string;
  description?: string;
}

interface SingleSelectCheckboxGroupProps<T extends string> {
  options: readonly CheckboxOption<T>[];
  selectedValue: T | null;
  onSelect: (value: T) => void;
  disabled?: boolean;
  compact?: boolean;
}

function SingleSelectCheckboxGroup<T extends string>({
  options,
  selectedValue,
  onSelect,
  disabled = false,
  compact = false,
}: SingleSelectCheckboxGroupProps<T>) {
  return (
    <View style={compact ? styles.checkboxGrid : styles.checkboxList}>
      {options.map((option) => {
        const checked = selectedValue === option.value;
        return (
          <Pressable
            key={option.value}
            style={[
              styles.checkboxOption,
              compact && styles.checkboxOptionCompact,
              checked && styles.checkboxOptionSelected,
              disabled && styles.disabledControl,
            ]}
            onPress={() => {
              if (!disabled) {
                onSelect(option.value);
              }
            }}
            disabled={disabled}
            accessibilityRole="checkbox"
            accessibilityState={{ checked, disabled }}
            accessibilityLabel={option.label}
          >
            <View
              style={[
                styles.checkboxBox,
                checked && styles.checkboxBoxChecked,
              ]}
            >
              <Text
                style={[
                  styles.checkboxCheckmark,
                  checked && styles.checkboxCheckmarkVisible,
                ]}
              >
                {checked ? '✓' : ' '}
              </Text>
            </View>
            <View style={styles.checkboxTextContainer}>
              <Text
                style={[
                  styles.checkboxLabel,
                  checked && styles.checkboxLabelSelected,
                ]}
              >
                {option.label}
              </Text>
              {option.description && !compact ? (
                <Text style={styles.checkboxDescription}>
                  {option.description}
                </Text>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const EMPTY_SUMMARY: ComplaintsSummary = {
  bySeverity: { BAJA: 0, MEDIA: 0, ALTA: 0, CRITICA: 0 },
  byStatus: { RECEIVED: 0, UNDER_REVIEW: 0, RESOLVED: 0, CLOSED: 0 },
};

interface Props {
  token: string;
  user: FalconUser;
  isOnline: boolean;
}

export default function FalconTeEscuchaScreen({
  token,
  user,
  isOnline,
}: Props) {
  const isAdmin = user.role === 'administrador';
  const [activeTab, setActiveTab] = useState<TabKey>(
    isAdmin ? 'bandeja' : 'nuevo',
  );

  // Catálogo de categorías
  const [categories, setCategories] = useState<ComplaintCategory[]>([
    ...DEFAULT_COMPLAINT_CATEGORIES,
  ]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  // Estado de "Nuevo reporte"
  const [selectedType, setSelectedType] = useState<ComplaintType | null>(
    'QUEJA',
  );
  const [selectedCategoryCode, setSelectedCategoryCode] = useState<
    string | null
  >('PROCESOS');
  const [selectedSeverity, setSelectedSeverity] =
    useState<ComplaintSeverity | null>('MEDIA');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdCase, setCreatedCase] =
    useState<CreatedComplaintSummary | null>(null);

  // Estado de "Mis casos" y Seguimiento por folio
  const [myCases, setMyCases] = useState<ComplaintRecord[]>([]);
  const [myCasesTotal, setMyCasesTotal] = useState(0);
  const [loadingMyCases, setLoadingMyCases] = useState(true);
  const [myCasesError, setMyCasesError] = useState<string | null>(null);

  const [folioQuery, setFolioQuery] = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [trackedCase, setTrackedCase] =
    useState<ComplaintTrackingResult | null>(null);

  // Estado de "Bandeja general" (exclusivo administrador)
  const [adminFilters, setAdminFilters] = useState<AdminComplaintFilters>({});
  const [adminCases, setAdminCases] = useState<ComplaintRecord[]>([]);
  const [adminTotal, setAdminTotal] = useState(0);
  const [adminSummary, setAdminSummary] =
    useState<ComplaintsSummary>(EMPTY_SUMMARY);
  const [loadingAdminCases, setLoadingAdminCases] = useState(isAdmin);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [exportingSummaryPdf, setExportingSummaryPdf] = useState(false);

  // Estado de "Detalle del caso" (exclusivo administrador)
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [caseDetail, setCaseDetail] = useState<ComplaintRecord | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [evalStatus, setEvalStatus] = useState<ComplaintStatusCode | null>(
    null,
  );
  const [evalSeverity, setEvalSeverity] = useState<ComplaintSeverity | null>(
    null,
  );
  const [evalFollowUpNote, setEvalFollowUpNote] = useState('');
  const [savingEvaluation, setSavingEvaluation] = useState(false);
  const [evaluationMessage, setEvaluationMessage] = useState<string | null>(
    null,
  );
  const [evaluationError, setEvaluationError] = useState<string | null>(null);
  const [exportingDetailPdf, setExportingDetailPdf] = useState(false);

  const reloadCategories = useCallback(async () => {
    setLoadingCategories(true);
    setCategoriesError(null);
    try {
      const items = await fetchComplaintCategories(token);
      if (items.length > 0) {
        setCategories(items);
        setSelectedCategoryCode((current) =>
          current && items.some((cat) => cat.code === current)
            ? current
            : (items[0]?.code ?? null),
        );
      }
    } catch (error) {
      setCategoriesError(
        error instanceof Error
          ? error.message
          : 'No se pudieron actualizar las categorías desde el servidor.',
      );
    } finally {
      setLoadingCategories(false);
    }
  }, [token]);

  const reloadMyCases = useCallback(async () => {
    setLoadingMyCases(true);
    setMyCasesError(null);
    try {
      const response = await fetchMyComplaints(token, 1, 50);
      setMyCases(response.items);
      setMyCasesTotal(response.total);
    } catch (error) {
      setMyCasesError(
        error instanceof Error
          ? error.message
          : 'No se pudieron cargar tus casos.',
      );
    } finally {
      setLoadingMyCases(false);
    }
  }, [token]);

  const reloadAdminCases = useCallback(
    async (filtersToApply: AdminComplaintFilters) => {
      if (!isAdmin) return;
      setLoadingAdminCases(true);
      setAdminError(null);
      try {
        const response = await fetchAdminComplaints(
          token,
          filtersToApply,
          1,
          50,
        );
        setAdminCases(response.items);
        setAdminTotal(response.total);
        setAdminSummary(response.summary);
      } catch (error) {
        setAdminError(
          error instanceof Error
            ? error.message
            : 'No se pudo cargar la Bandeja general.',
        );
      } finally {
        setLoadingAdminCases(false);
      }
    },
    [isAdmin, token],
  );

  useEffect(() => {
    let active = true;
    const bootstrap = async () => {
      try {
        const items = await fetchComplaintCategories(token);
        if (!active) return;
        if (items.length > 0) {
          setCategories(items);
          setSelectedCategoryCode((current) =>
            current && items.some((cat) => cat.code === current)
              ? current
              : (items[0]?.code ?? null),
          );
        }
        setCategoriesError(null);
      } catch (error) {
        if (!active) return;
        setCategoriesError(
          error instanceof Error
            ? error.message
            : 'No se pudieron cargar las categorías.',
        );
      } finally {
        if (active) {
          setLoadingCategories(false);
        }
      }

      try {
        const mine = await fetchMyComplaints(token, 1, 50);
        if (!active) return;
        setMyCases(mine.items);
        setMyCasesTotal(mine.total);
        setMyCasesError(null);
      } catch (error) {
        if (!active) return;
        setMyCasesError(
          error instanceof Error
            ? error.message
            : 'No se pudieron cargar tus casos.',
        );
      } finally {
        if (active) {
          setLoadingMyCases(false);
        }
      }
    };

    void bootstrap();
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (!isAdmin) return undefined;
    let active = true;
    const loadTray = async () => {
      try {
        const response = await fetchAdminComplaints(token, adminFilters, 1, 50);
        if (!active) return;
        setAdminCases(response.items);
        setAdminTotal(response.total);
        setAdminSummary(response.summary);
        setAdminError(null);
      } catch (error) {
        if (!active) return;
        setAdminError(
          error instanceof Error
            ? error.message
            : 'No se pudo cargar la Bandeja general.',
        );
      } finally {
        if (active) {
          setLoadingAdminCases(false);
        }
      }
    };
    void loadTray();
    return () => {
      active = false;
    };
  }, [adminFilters, isAdmin, token]);

  const handleApplyFilter = (nextFilters: AdminComplaintFilters) => {
    setLoadingAdminCases(true);
    setAdminError(null);
    setAdminFilters(nextFilters);
  };

  const handleCreateReport = async () => {
    const validated = validateComplaintForm({
      type: selectedType,
      categoryCode: selectedCategoryCode,
      severity: selectedSeverity,
      subject,
      description,
    });
    if (!validated.ok) {
      setFormError(validated.error);
      return;
    }

    setFormError(null);
    setCreatedCase(null);
    setSubmitting(true);
    try {
      const created = await createComplaint(token, validated.value);
      setCreatedCase(created);
      setSubject('');
      setDescription('');
      await reloadMyCases();
      if (isAdmin) {
        await reloadAdminCases(adminFilters);
      }
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : 'No se pudo enviar el reporte.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrackFolio = async () => {
    setTrackingError(null);
    setTrackedCase(null);
    setTrackingLoading(true);
    try {
      const result = await trackComplaintByFolio(token, folioQuery);
      setTrackedCase(result);
    } catch (error) {
      setTrackingError(
        error instanceof Error
          ? error.message
          : 'No se pudo consultar el folio.',
      );
    } finally {
      setTrackingLoading(false);
    }
  };

  const handleOpenCaseDetail = async (item: ComplaintRecord) => {
    setSelectedCaseId(item.id);
    setCaseDetail(item);
    setEvalStatus(item.status.code as ComplaintStatusCode);
    setEvalSeverity(item.severity);
    setEvalFollowUpNote(item.followUpNote ?? '');
    setDetailError(null);
    setEvaluationError(null);
    setEvaluationMessage(null);
    setLoadingDetail(true);
    try {
      const fresh = await fetchAdminComplaintById(token, item.id);
      setCaseDetail(fresh);
      setEvalStatus(fresh.status.code as ComplaintStatusCode);
      setEvalSeverity(fresh.severity);
      setEvalFollowUpNote(fresh.followUpNote ?? '');
    } catch (error) {
      setDetailError(
        error instanceof Error
          ? error.message
          : 'No se pudo refrescar el detalle desde el servidor.',
      );
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSaveEvaluation = async () => {
    if (!caseDetail || !evalStatus || !evalSeverity) return;
    setEvaluationError(null);
    setEvaluationMessage(null);
    setSavingEvaluation(true);
    try {
      const trimmedNote = evalFollowUpNote.trim();
      const updated = await updateAdminComplaint(token, caseDetail.id, {
        statusCode: evalStatus,
        severity: evalSeverity,
        followUpNote: trimmedNote.length > 0 ? trimmedNote : null,
      });
      setCaseDetail(updated);
      setEvalStatus(updated.status.code as ComplaintStatusCode);
      setEvalSeverity(updated.severity);
      setEvalFollowUpNote(updated.followUpNote ?? '');
      setEvaluationMessage(
        'Evaluación guardada y registrada en la bitácora de auditoría.',
      );
      await reloadAdminCases(adminFilters);
      await reloadMyCases();
    } catch (error) {
      setEvaluationError(
        error instanceof Error
          ? error.message
          : 'No se pudieron guardar los cambios del caso.',
      );
    } finally {
      setSavingEvaluation(false);
    }
  };

  const handleExportSummaryPdf = async () => {
    if (exportingSummaryPdf) return;
    setExportingSummaryPdf(true);
    try {
      const ticketResult = await requestComplaintPdfTicket(token, {
        scope: 'summary',
        filters: adminFilters,
      });
      await Linking.openURL(ticketResult.downloadUrl);
    } catch (error) {
      Alert.alert(
        'No se pudo exportar el PDF',
        error instanceof Error
          ? error.message
          : 'Verifica tu conexión con el servidor local.',
      );
    } finally {
      setExportingSummaryPdf(false);
    }
  };

  const handleExportDetailPdf = async () => {
    if (!caseDetail || exportingDetailPdf) return;
    setExportingDetailPdf(true);
    try {
      const ticketResult = await requestComplaintPdfTicket(token, {
        scope: 'single',
        complaintId: caseDetail.id,
      });
      await Linking.openURL(ticketResult.downloadUrl);
    } catch (error) {
      Alert.alert(
        'No se pudo descargar la ficha PDF',
        error instanceof Error
          ? error.message
          : 'Verifica tu conexión con el servidor local.',
      );
    } finally {
      setExportingDetailPdf(false);
    }
  };

  const renderSeverityBadge = (severity: ComplaintSeverity, prefix?: string) => {
    const palette = getSeverityBadgePalette(severity);
    return (
      <View
        style={[
          styles.badge,
          {
            backgroundColor: palette.backgroundColor,
            borderColor: palette.borderColor,
          },
        ]}
      >
        <Text style={[styles.badgeText, { color: palette.textColor }]}>
          {prefix ? `${prefix}: ` : ''}
          {getComplaintSeverityLabel(severity)}
        </Text>
      </View>
    );
  };

  const renderStatusBadge = (statusCode: string, statusName?: string) => {
    const palette = getStatusBadgePalette(statusCode);
    return (
      <View
        style={[
          styles.badge,
          {
            backgroundColor: palette.backgroundColor,
            borderColor: palette.borderColor,
          },
        ]}
      >
        <Text style={[styles.badgeText, { color: palette.textColor }]}>
          {getComplaintStatusLabel(statusCode, statusName)}
        </Text>
      </View>
    );
  };

  const hasActiveAdminFilters = Boolean(
    adminFilters.severity ||
      adminFilters.status ||
      adminFilters.type ||
      adminFilters.category,
  );

  // Vista "Detalle del caso" exclusiva de Administrador
  if (isAdmin && activeTab === 'bandeja' && selectedCaseId && caseDetail) {
    const reclassified = caseDetail.severity !== caseDetail.reportedSeverity;
    return (
      <View style={styles.screen}>
        <Pressable
          style={styles.backLink}
          onPress={() => {
            setSelectedCaseId(null);
            setCaseDetail(null);
            setEvaluationMessage(null);
            setEvaluationError(null);
          }}
          accessibilityRole="button"
        >
          <Text style={styles.backLinkText}>← Volver a Bandeja general</Text>
        </Pressable>

        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>EXPEDIENTE CONFIDENCIAL</Text>
            <Text style={styles.screenTitle}>Folio {caseDetail.folio}</Text>
          </View>
          <Pressable
            style={[
              styles.pdfButton,
              exportingDetailPdf && styles.disabledControl,
            ]}
            onPress={() => void handleExportDetailPdf()}
            disabled={exportingDetailPdf}
            accessibilityRole="button"
            accessibilityLabel="Descargar ficha PDF"
          >
            {exportingDetailPdf ? (
              <ActivityIndicator size="small" color={COLORS.background} />
            ) : (
              <Text style={styles.pdfButtonText}>Descargar ficha PDF</Text>
            )}
          </Pressable>
        </View>

        {loadingDetail && (
          <View style={styles.inlineLoading}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.inlineLoadingText}>
              Actualizando expediente...
            </Text>
          </View>
        )}

        {detailError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{detailError}</Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Datos de quien reporta</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nombre completo:</Text>
              <Text style={styles.infoValue}>{caseDetail.submitter.name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>ID de usuario:</Text>
              <Text style={styles.infoValue}>
                #{caseDetail.submitter.userId}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Número de empleado:</Text>
              <Text style={styles.infoValue}>
                {caseDetail.submitter.employeeNumber}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Correo:</Text>
              <Text style={styles.infoValue}>
                {caseDetail.submitter.email || 'No registrado'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Área:</Text>
              <Text style={styles.infoValue}>
                {caseDetail.submitter.area || 'No registrada'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Puesto:</Text>
              <Text style={styles.infoValue}>
                {caseDetail.submitter.position || 'No registrado'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Información del reporte</Text>
          <View style={styles.badgeRow}>
            {renderStatusBadge(caseDetail.status.code, caseDetail.status.name)}
            {renderSeverityBadge(caseDetail.severity, 'Gravedad oficial')}
            {renderSeverityBadge(
              caseDetail.reportedSeverity,
              'Reportada por colaborador',
            )}
          </View>
          {reclassified && (
            <Text style={styles.reclassifiedNotice}>
              Gravedad reclasificada por Administración (reportada:{' '}
              {getComplaintSeverityLabel(caseDetail.reportedSeverity)} →
              oficial: {getComplaintSeverityLabel(caseDetail.severity)}).
            </Text>
          )}

          <View style={styles.infoGrid}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tipo:</Text>
              <Text style={styles.infoValue}>
                {getComplaintTypeLabel(caseDetail.type)}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Categoría:</Text>
              <Text style={styles.infoValue}>{caseDetail.category.name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Creado:</Text>
              <Text style={styles.infoValue}>
                {formatNewsDate(caseDetail.createdAt, true)}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Actualizado:</Text>
              <Text style={styles.infoValue}>
                {formatNewsDate(caseDetail.updatedAt, true)}
              </Text>
            </View>
            {caseDetail.resolvedAt && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Resuelto:</Text>
                <Text style={styles.infoValue}>
                  {formatNewsDate(caseDetail.resolvedAt, true)}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.divider} />
          <Text style={styles.detailSubject}>{caseDetail.subject}</Text>
          <Text style={styles.detailDescription}>{caseDetail.description}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Panel de evaluación administrativa
          </Text>
          <Text style={styles.sectionSubtitle}>
            Selecciona una única opción para estado y gravedad oficial, y
            registra la nota de seguimiento.
          </Text>

          <Text style={styles.fieldLabel}>Estado del caso (selección única)</Text>
          <SingleSelectCheckboxGroup
            options={COMPLAINT_STATUS_OPTIONS}
            selectedValue={evalStatus}
            onSelect={setEvalStatus}
            disabled={savingEvaluation}
          />

          <Text style={styles.fieldLabel}>
            Gravedad oficial evaluada (selección única)
          </Text>
          <SingleSelectCheckboxGroup
            options={COMPLAINT_SEVERITY_OPTIONS}
            selectedValue={evalSeverity}
            onSelect={setEvalSeverity}
            disabled={savingEvaluation}
          />

          <Text style={styles.fieldLabel}>
            Nota de seguimiento ({evalFollowUpNote.trim().length}/
            {COMPLAINT_NOTE_MAX_LENGTH})
          </Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={evalFollowUpNote}
            onChangeText={setEvalFollowUpNote}
            placeholder="Describe las acciones tomadas, acuerdos o resolución..."
            placeholderTextColor={COLORS.textSecondary}
            maxLength={COMPLAINT_NOTE_MAX_LENGTH}
            multiline
            editable={!savingEvaluation}
            accessibilityLabel="Nota de seguimiento"
          />

          {evaluationError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{evaluationError}</Text>
            </View>
          )}

          {evaluationMessage && (
            <View style={styles.successBanner}>
              <Text style={styles.successBannerText}>{evaluationMessage}</Text>
            </View>
          )}

          <Pressable
            style={[
              styles.primaryButton,
              savingEvaluation && styles.disabledControl,
            ]}
            onPress={() => void handleSaveEvaluation()}
            disabled={savingEvaluation}
            accessibilityRole="button"
            accessibilityLabel="Guardar cambios"
          >
            {savingEvaluation ? (
              <ActivityIndicator size="small" color={COLORS.background} />
            ) : (
              <Text style={styles.primaryButtonText}>Guardar cambios</Text>
            )}
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.titleBlock}>
        <Text style={styles.eyebrow}>CANAL INSTITUCIONAL CONFIDENCIAL</Text>
        <Text style={styles.screenTitle}>Falcón te escucha</Text>
        <Text style={styles.screenSubtitle}>
          Espacio directo y confidencial para registrar quejas, sugerencias e
          incidencias con evaluación de gravedad y seguimiento puntual.
        </Text>
      </View>

      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>
            Este módulo requiere conexión activa con el servidor local para
            enviar reportes, consultar folios o exportar PDFs.
          </Text>
        </View>
      )}

      {/* Pestañas según rol */}
      <View style={styles.tabsContainer}>
        {isAdmin && (
          <Pressable
            style={[
              styles.tabButton,
              activeTab === 'bandeja' && styles.tabButtonActive,
            ]}
            onPress={() => setActiveTab('bandeja')}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'bandeja' }}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'bandeja' && styles.tabButtonTextActive,
              ]}
            >
              Bandeja general
            </Text>
          </Pressable>
        )}
        <Pressable
          style={[
            styles.tabButton,
            activeTab === 'nuevo' && styles.tabButtonActive,
          ]}
          onPress={() => setActiveTab('nuevo')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'nuevo' }}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'nuevo' && styles.tabButtonTextActive,
            ]}
          >
            Nuevo reporte
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.tabButton,
            activeTab === 'mis-casos' && styles.tabButtonActive,
          ]}
          onPress={() => {
            setActiveTab('mis-casos');
            void reloadMyCases();
          }}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'mis-casos' }}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'mis-casos' && styles.tabButtonTextActive,
            ]}
          >
            Mis casos ({myCasesTotal})
          </Text>
        </Pressable>
      </View>

      {/* VISTA 1: BANDEJA GENERAL (Exclusivo Administrador) */}
      {isAdmin && activeTab === 'bandeja' && (
        <View style={styles.sectionStack}>
          <View style={styles.card}>
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>
                  Resumen de casos ({adminTotal})
                </Text>
                <Text style={styles.sectionSubtitle}>
                  Acceso exclusivo para Administración
                </Text>
              </View>
              <Pressable
                style={[
                  styles.pdfButton,
                  exportingSummaryPdf && styles.disabledControl,
                ]}
                onPress={() => void handleExportSummaryPdf()}
                disabled={exportingSummaryPdf}
                accessibilityRole="button"
                accessibilityLabel="Exportar PDF"
              >
                {exportingSummaryPdf ? (
                  <View style={styles.pdfLoadingRow}>
                    <ActivityIndicator size="small" color={COLORS.background} />
                    <Text style={styles.pdfButtonText}>Generando PDF...</Text>
                  </View>
                ) : (
                  <Text style={styles.pdfButtonText}>Exportar PDF</Text>
                )}
              </Pressable>
            </View>

            <View style={styles.summaryGrid}>
              {(
                [
                  ['CRITICA', 'Crítica', '#9B1C1C', '#FDE8E8'],
                  ['ALTA', 'Alta', '#92400E', '#FEF3C7'],
                  ['MEDIA', 'Media', '#075985', '#E0F2FE'],
                  ['BAJA', 'Baja', '#065F46', '#ECFDF5'],
                ] as const
              ).map(([sevKey, label, textColor, bgColor]) => (
                <View
                  key={sevKey}
                  style={[styles.summaryCard, { backgroundColor: bgColor }]}
                >
                  <Text style={[styles.summaryCount, { color: textColor }]}>
                    {adminSummary.bySeverity[sevKey]}
                  </Text>
                  <Text style={[styles.summaryLabel, { color: textColor }]}>
                    {label}
                  </Text>
                </View>
              ))}
            </View>

            {/* Filtros rápidos tocables */}
            <Text style={styles.filterGroupLabel}>Filtrar por gravedad:</Text>
            <View style={styles.chipRow}>
              <Pressable
                style={[
                  styles.filterChip,
                  !adminFilters.severity && styles.filterChipActive,
                ]}
                onPress={() =>
                  handleApplyFilter({ ...adminFilters, severity: undefined })
                }
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.filterChipText,
                    !adminFilters.severity && styles.filterChipTextActive,
                  ]}
                >
                  Todas
                </Text>
              </Pressable>
              {COMPLAINT_SEVERITY_OPTIONS.map((opt) => {
                const selected = adminFilters.severity === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    style={[
                      styles.filterChip,
                      selected && styles.filterChipActive,
                    ]}
                    onPress={() =>
                      handleApplyFilter({
                        ...adminFilters,
                        severity: selected ? undefined : opt.value,
                      })
                    }
                    accessibilityRole="button"
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selected && styles.filterChipTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.filterGroupLabel}>Filtrar por estado:</Text>
            <View style={styles.chipRow}>
              <Pressable
                style={[
                  styles.filterChip,
                  !adminFilters.status && styles.filterChipActive,
                ]}
                onPress={() =>
                  handleApplyFilter({ ...adminFilters, status: undefined })
                }
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.filterChipText,
                    !adminFilters.status && styles.filterChipTextActive,
                  ]}
                >
                  Todos
                </Text>
              </Pressable>
              {COMPLAINT_STATUS_OPTIONS.map((opt) => {
                const selected = adminFilters.status === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    style={[
                      styles.filterChip,
                      selected && styles.filterChipActive,
                    ]}
                    onPress={() =>
                      handleApplyFilter({
                        ...adminFilters,
                        status: selected ? undefined : opt.value,
                      })
                    }
                    accessibilityRole="button"
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selected && styles.filterChipTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.filterGroupLabel}>Filtrar por tipo:</Text>
            <View style={styles.chipRow}>
              <Pressable
                style={[
                  styles.filterChip,
                  !adminFilters.type && styles.filterChipActive,
                ]}
                onPress={() =>
                  handleApplyFilter({ ...adminFilters, type: undefined })
                }
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.filterChipText,
                    !adminFilters.type && styles.filterChipTextActive,
                  ]}
                >
                  Todos
                </Text>
              </Pressable>
              {COMPLAINT_TYPE_OPTIONS.map((opt) => {
                const selected = adminFilters.type === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    style={[
                      styles.filterChip,
                      selected && styles.filterChipActive,
                    ]}
                    onPress={() =>
                      handleApplyFilter({
                        ...adminFilters,
                        type: selected ? undefined : opt.value,
                      })
                    }
                    accessibilityRole="button"
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selected && styles.filterChipTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.trayActionsRow}>
              {hasActiveAdminFilters && (
                <Pressable
                  style={styles.clearFiltersButton}
                  onPress={() => handleApplyFilter({})}
                  accessibilityRole="button"
                >
                  <Text style={styles.clearFiltersText}>Limpiar filtros</Text>
                </Pressable>
              )}
              <Pressable
                style={styles.refreshOutlineButton}
                onPress={() => void reloadAdminCases(adminFilters)}
                disabled={loadingAdminCases}
                accessibilityRole="button"
              >
                <Text style={styles.refreshOutlineText}>
                  ↻ Actualizar bandeja
                </Text>
              </Pressable>
            </View>
          </View>

          {adminError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{adminError}</Text>
            </View>
          )}

          {loadingAdminCases ? (
            <View style={styles.card}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.emptyText}>
                Cargando casos de la bandeja administrativa...
              </Text>
            </View>
          ) : adminCases.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.emptyText}>
                No se encontraron casos con los filtros seleccionados.
              </Text>
            </View>
          ) : (
            adminCases.map((item) => {
              const reclassified = item.severity !== item.reportedSeverity;
              return (
                <Pressable
                  key={item.id}
                  style={styles.caseCard}
                  onPress={() => void handleOpenCaseDetail(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`Abrir caso ${item.folio}`}
                >
                  <View style={styles.caseHeaderRow}>
                    <Text style={styles.caseFolio}>{item.folio}</Text>
                    <Text style={styles.caseDate}>
                      {formatNewsDate(item.createdAt)}
                    </Text>
                  </View>

                  <View style={styles.badgeRow}>
                    {renderSeverityBadge(item.severity)}
                    {renderStatusBadge(item.status.code, item.status.name)}
                    <View style={styles.neutralTag}>
                      <Text style={styles.neutralTagText}>
                        {getComplaintTypeLabel(item.type)} ·{' '}
                        {item.category.name}
                      </Text>
                    </View>
                  </View>

                  {reclassified && (
                    <Text style={styles.reclassifiedTag}>
                      Reclasificada (reportada:{' '}
                      {getComplaintSeverityLabel(item.reportedSeverity)})
                    </Text>
                  )}

                  <Text style={styles.caseSubject}>{item.subject}</Text>
                  <Text style={styles.caseSubmitter}>
                    Remitente: {item.submitter.name} ·{' '}
                    {item.submitter.employeeNumber} (ID #{item.submitter.userId}
                    )
                  </Text>
                  <Text style={styles.caseLinkHint}>
                    Evaluar caso o descargar ficha PDF ›
                  </Text>
                </Pressable>
              );
            })
          )}
        </View>
      )}

      {/* VISTA 2: NUEVO REPORTE (Todos los roles autenticados) */}
      {activeTab === 'nuevo' && (
        <View style={styles.sectionStack}>
          <View style={styles.confidentialNotice}>
            <Text style={styles.confidentialNoticeTitle}>
              Confidencialidad garantizada
            </Text>
            <Text style={styles.confidentialNoticeText}>
              Tu reporte se vincula de forma segura a tu cuenta ({user.name} ·{' '}
              {user.employeeNumber}) para darte seguimiento puntual. Únicamente
              el Administrador tiene acceso a este canal.
            </Text>
          </View>

          {createdCase && (
            <View style={styles.confirmationCard}>
              <Text style={styles.confirmationTitle}>
                ¡Reporte registrado con éxito!
              </Text>
              <Text style={styles.confirmationFolio}>
                Folio: {createdCase.folio}
              </Text>
              <Text style={styles.confirmationDetail}>
                Tipo: {getComplaintTypeLabel(createdCase.type)} · Gravedad:{' '}
                {getComplaintSeverityLabel(createdCase.severity)} · Estado:{' '}
                {getComplaintStatusLabel(createdCase.status)}
              </Text>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => {
                  setFolioQuery(createdCase.folio);
                  setActiveTab('mis-casos');
                }}
                accessibilityRole="button"
              >
                <Text style={styles.secondaryButtonText}>
                  Consultar en Mis casos ›
                </Text>
              </Pressable>
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>1. Tipo de reporte</Text>
            <Text style={styles.sectionSubtitle}>
              Marca una única casilla según la naturaleza de tu caso.
            </Text>
            <SingleSelectCheckboxGroup
              options={COMPLAINT_TYPE_OPTIONS}
              selectedValue={selectedType}
              onSelect={setSelectedType}
              disabled={submitting}
            />

            <View style={styles.categoryHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>2. Categoría</Text>
                <Text style={styles.sectionSubtitle}>
                  Selecciona el ámbito principal relacionado con el reporte.
                </Text>
              </View>
              {loadingCategories && (
                <ActivityIndicator size="small" color={COLORS.primary} />
              )}
            </View>
            {categoriesError && (
              <Pressable
                style={styles.retryInline}
                onPress={() => void reloadCategories()}
                accessibilityRole="button"
              >
                <Text style={styles.retryInlineText}>
                  {categoriesError} (Toca para reintentar)
                </Text>
              </Pressable>
            )}
            <SingleSelectCheckboxGroup
              options={categories.map((cat) => ({
                value: cat.code,
                label: cat.name,
              }))}
              selectedValue={selectedCategoryCode}
              onSelect={setSelectedCategoryCode}
              disabled={submitting}
              compact
            />

            <Text style={[styles.sectionTitle, { marginTop: 14 }]}>
              3. Gravedad percibida
            </Text>
            <Text style={styles.sectionSubtitle}>
              Indica la urgencia o impacto que percibes en esta situación.
            </Text>
            <SingleSelectCheckboxGroup
              options={COMPLAINT_SEVERITY_OPTIONS}
              selectedValue={selectedSeverity}
              onSelect={setSelectedSeverity}
              disabled={submitting}
            />

            <Text style={styles.fieldLabel}>
              4. Asunto ({subject.trim().length}/{COMPLAINT_SUBJECT_MAX_LENGTH})
            </Text>
            <TextInput
              style={styles.textInput}
              value={subject}
              onChangeText={setSubject}
              placeholder="Resumen breve del caso"
              placeholderTextColor={COLORS.textSecondary}
              maxLength={COMPLAINT_SUBJECT_MAX_LENGTH}
              editable={!submitting}
              accessibilityLabel="Asunto del reporte"
            />

            <Text style={styles.fieldLabel}>
              5. Descripción detallada ({description.trim().length}/
              {COMPLAINT_DESCRIPTION_MAX_LENGTH})
            </Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe qué ocurrió, dónde y cualquier detalle relevante para su atención..."
              placeholderTextColor={COLORS.textSecondary}
              maxLength={COMPLAINT_DESCRIPTION_MAX_LENGTH}
              multiline
              editable={!submitting}
              accessibilityLabel="Descripción del reporte"
            />

            {formError && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{formError}</Text>
              </View>
            )}

            <Pressable
              style={[
                styles.primaryButton,
                submitting && styles.disabledControl,
              ]}
              onPress={() => void handleCreateReport()}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel="Enviar reporte confidencial"
            >
              {submitting ? (
                <ActivityIndicator size="small" color={COLORS.background} />
              ) : (
                <Text style={styles.primaryButtonText}>
                  Enviar reporte confidencial
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      )}

      {/* VISTA 3: MIS CASOS Y SEGUIMIENTO POR FOLIO */}
      {activeTab === 'mis-casos' && (
        <View style={styles.sectionStack}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Seguimiento rápido por folio</Text>
            <Text style={styles.sectionSubtitle}>
              Consulta el estado y la nota de seguimiento de cualquiera de tus
              folios registrados.
            </Text>
            <View style={styles.folioSearchRow}>
              <TextInput
                style={[styles.textInput, styles.folioInput]}
                value={folioQuery}
                onChangeText={setFolioQuery}
                placeholder="Ej. FLC-7K2M-9Q4R"
                placeholderTextColor={COLORS.textSecondary}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={20}
                editable={!trackingLoading}
                accessibilityLabel="Folio a consultar"
              />
              <Pressable
                style={[
                  styles.folioSearchButton,
                  trackingLoading && styles.disabledControl,
                ]}
                onPress={() => void handleTrackFolio()}
                disabled={trackingLoading}
                accessibilityRole="button"
                accessibilityLabel="Buscar folio"
              >
                {trackingLoading ? (
                  <ActivityIndicator size="small" color={COLORS.background} />
                ) : (
                  <Text style={styles.folioSearchButtonText}>Consultar</Text>
                )}
              </Pressable>
            </View>

            {trackingError && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{trackingError}</Text>
              </View>
            )}

            {trackedCase && (
              <View style={styles.trackedCard}>
                <View style={styles.caseHeaderRow}>
                  <Text style={styles.caseFolio}>{trackedCase.folio}</Text>
                  <Text style={styles.caseDate}>
                    Actualizado: {formatNewsDate(trackedCase.updatedAt, true)}
                  </Text>
                </View>
                <View style={styles.badgeRow}>
                  {renderStatusBadge(
                    trackedCase.status,
                    trackedCase.statusName,
                  )}
                  {renderSeverityBadge(
                    trackedCase.severity,
                    'Gravedad oficial',
                  )}
                  <View style={styles.neutralTag}>
                    <Text style={styles.neutralTagText}>
                      {getComplaintTypeLabel(trackedCase.type)}
                    </Text>
                  </View>
                </View>
                {trackedCase.followUpNote ? (
                  <View style={styles.noteBox}>
                    <Text style={styles.noteBoxTitle}>
                      Nota de seguimiento administrativo:
                    </Text>
                    <Text style={styles.noteBoxText}>
                      {trackedCase.followUpNote}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.noNoteText}>
                    Sin nota de seguimiento registrada por el momento.
                  </Text>
                )}
              </View>
            )}
          </View>

          <View style={styles.headerRow}>
            <Text style={styles.sectionTitle}>
              Mis casos registrados ({myCasesTotal})
            </Text>
            <Pressable
              style={styles.refreshOutlineButton}
              onPress={() => void reloadMyCases()}
              disabled={loadingMyCases}
              accessibilityRole="button"
            >
              <Text style={styles.refreshOutlineText}>↻ Recargar</Text>
            </Pressable>
          </View>

          {myCasesError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{myCasesError}</Text>
            </View>
          )}

          {loadingMyCases ? (
            <View style={styles.card}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.emptyText}>Cargando tus reportes...</Text>
            </View>
          ) : myCases.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.emptyText}>
                Aún no has registrado casos en Falcón te escucha.
              </Text>
            </View>
          ) : (
            myCases.map((item) => (
              <View key={item.id} style={styles.caseCard}>
                <View style={styles.caseHeaderRow}>
                  <Text style={styles.caseFolio}>{item.folio}</Text>
                  <Text style={styles.caseDate}>
                    {formatNewsDate(item.createdAt, true)}
                  </Text>
                </View>

                <View style={styles.badgeRow}>
                  {renderSeverityBadge(item.severity, 'Gravedad')}
                  {renderStatusBadge(item.status.code, item.status.name)}
                  <View style={styles.neutralTag}>
                    <Text style={styles.neutralTagText}>
                      {getComplaintTypeLabel(item.type)} · {item.category.name}
                    </Text>
                  </View>
                </View>

                <Text style={styles.caseSubject}>{item.subject}</Text>
                <Text style={styles.caseDescription}>{item.description}</Text>

                {item.followUpNote ? (
                  <View style={styles.noteBox}>
                    <Text style={styles.noteBoxTitle}>
                      Seguimiento de Administración:
                    </Text>
                    <Text style={styles.noteBoxText}>{item.followUpNote}</Text>
                  </View>
                ) : null}
              </View>
            ))
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: 14,
    paddingVertical: 10,
  },
  sectionStack: {
    gap: 14,
  },
  titleBlock: {
    backgroundColor: COLORS.background,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  eyebrow: {
    color: COLORS.primaryDark,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  screenTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4,
  },
  screenSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  offlineBanner: {
    backgroundColor: '#FFF4D6',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F5D488',
  },
  offlineBannerText: {
    color: '#6A4A00',
    fontSize: 12,
    lineHeight: 18,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 5,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: COLORS.primary,
  },
  tabButtonText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  tabButtonTextActive: {
    color: COLORS.background,
  },
  card: {
    backgroundColor: COLORS.background,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    flexWrap: 'wrap',
  },
  categoryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  confidentialNotice: {
    backgroundColor: '#FDF2F2',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F5C2C2',
    gap: 4,
  },
  confidentialNoticeTitle: {
    color: COLORS.primaryDark,
    fontSize: 13,
    fontWeight: '800',
  },
  confidentialNoticeText: {
    color: COLORS.text,
    fontSize: 12,
    lineHeight: 18,
  },
  confirmationCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#A5D6A7',
    gap: 6,
  },
  confirmationTitle: {
    color: '#1B5E20',
    fontSize: 15,
    fontWeight: '800',
  },
  confirmationFolio: {
    color: '#1B5E20',
    fontSize: 18,
    fontWeight: '800',
  },
  confirmationDetail: {
    color: '#2E7D32',
    fontSize: 12,
    lineHeight: 18,
  },
  checkboxList: {
    gap: 8,
    marginTop: 4,
  },
  checkboxGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  checkboxOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 11,
    backgroundColor: COLORS.background,
    gap: 10,
  },
  checkboxOptionCompact: {
    width: '48%',
    alignItems: 'center',
  },
  checkboxOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#FDF2F2',
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#9CA3AF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  checkboxBoxChecked: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  checkboxCheckmark: {
    color: 'transparent',
    fontSize: 13,
    fontWeight: '800',
  },
  checkboxCheckmarkVisible: {
    color: COLORS.background,
  },
  checkboxTextContainer: {
    flex: 1,
    gap: 2,
  },
  checkboxLabel: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  checkboxLabelSelected: {
    color: COLORS.primaryDark,
  },
  checkboxDescription: {
    color: COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 15,
  },
  fieldLabel: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 10,
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.background,
  },
  textArea: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingHorizontal: 14,
  },
  primaryButtonText: {
    color: COLORS.background,
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#2E7D32',
    borderRadius: 9,
    paddingVertical: 9,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  secondaryButtonText: {
    color: '#1B5E20',
    fontSize: 12,
    fontWeight: '800',
  },
  pdfButton: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: 9,
    paddingHorizontal: 13,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pdfButtonText: {
    color: COLORS.background,
    fontSize: 12,
    fontWeight: '800',
  },
  disabledControl: {
    opacity: 0.5,
  },
  errorBanner: {
    backgroundColor: '#FDECEC',
    borderRadius: 9,
    padding: 11,
    borderWidth: 1,
    borderColor: '#F5C2C2',
  },
  errorBannerText: {
    color: COLORS.error,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  successBanner: {
    backgroundColor: '#E8F5E9',
    borderRadius: 9,
    padding: 11,
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  successBannerText: {
    color: '#1B5E20',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    marginVertical: 4,
  },
  summaryCard: {
    width: '23%',
    minWidth: 70,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCount: {
    fontSize: 19,
    fontWeight: '800',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  filterGroupLabel: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingHorizontal: 11,
    paddingVertical: 6,
    backgroundColor: COLORS.surface,
  },
  filterChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  filterChipText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: COLORS.background,
  },
  trayActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  clearFiltersButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  clearFiltersText: {
    color: COLORS.primaryDark,
    fontSize: 12,
    fontWeight: '700',
  },
  refreshOutlineButton: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  refreshOutlineText: {
    color: COLORS.primaryDark,
    fontSize: 12,
    fontWeight: '700',
  },
  caseCard: {
    backgroundColor: COLORS.background,
    borderRadius: 13,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  caseHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  caseFolio: {
    color: COLORS.primaryDark,
    fontSize: 14,
    fontWeight: '800',
  },
  caseDate: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  badge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  neutralTag: {
    backgroundColor: COLORS.surface,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  neutralTagText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  reclassifiedTag: {
    color: '#92400E',
    fontSize: 11,
    fontWeight: '700',
  },
  reclassifiedNotice: {
    color: '#92400E',
    backgroundColor: '#FEF3C7',
    padding: 9,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: '600',
  },
  caseSubject: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
  },
  caseDescription: {
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 19,
  },
  caseSubmitter: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  caseLinkHint: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  folioSearchRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  folioInput: {
    flex: 1,
  },
  folioSearchButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 15,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  folioSearchButtonText: {
    color: COLORS.background,
    fontSize: 13,
    fontWeight: '800',
  },
  trackedCard: {
    marginTop: 6,
    padding: 12,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  noteBox: {
    backgroundColor: '#F8FAFC',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    borderRadius: 8,
    padding: 10,
    gap: 3,
  },
  noteBoxTitle: {
    color: COLORS.primaryDark,
    fontSize: 11,
    fontWeight: '800',
  },
  noteBoxText: {
    color: COLORS.text,
    fontSize: 12,
    lineHeight: 18,
  },
  noNoteText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontStyle: 'italic',
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 10,
  },
  backLink: {
    paddingVertical: 6,
  },
  backLinkText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  inlineLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inlineLoadingText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  infoGrid: {
    gap: 6,
    marginTop: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    flexWrap: 'wrap',
  },
  infoLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  infoValue: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 8,
  },
  detailSubject: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
  },
  detailDescription: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 21,
  },
  retryInline: {
    paddingVertical: 4,
  },
  retryInlineText: {
    color: COLORS.error,
    fontSize: 12,
    fontWeight: '700',
  },
});
