'use strict';
// Raiz de composição: único lugar que conhece as implementações concretas e as injeta (DIP).
const path = require('node:path');

const SqliteDatabase = require('./infrastructure/database/SqliteDatabase');
const FornecedorRepository = require('./infrastructure/repositories/FornecedorRepository');
const NaturezaRepository = require('./infrastructure/repositories/NaturezaRepository');
const CentroRepository = require('./infrastructure/repositories/CentroRepository');
const UsuarioRepository = require('./infrastructure/repositories/UsuarioRepository');
const TituloRepository = require('./infrastructure/repositories/TituloRepository');
const DashboardRepository = require('./infrastructure/repositories/DashboardRepository');
const AuditRepository = require('./infrastructure/repositories/AuditRepository');
const PasswordHasher = require('./infrastructure/security/PasswordHasher');
const SessionStore = require('./infrastructure/security/SessionStore');
const LoginThrottle = require('./infrastructure/security/LoginThrottle');
const CsvWriter = require('./infrastructure/csv/CsvWriter');
const CsvParser = require('./infrastructure/csv/CsvParser');
const ReceitaWsGateway = require('./infrastructure/http/ReceitaWsGateway');
const NoUpdater = require('./infrastructure/update/NoUpdater');

const FieldSanitizer = require('./domain/validation/FieldSanitizer');
const TituloValidator = require('./domain/validation/TituloValidator');
const BaixaValidator = require('./domain/validation/BaixaValidator');
const ProfilePhotoValidator = require('./domain/validation/ProfilePhotoValidator');
const TituloPolicy = require('./domain/policies/TituloPolicy');
const { FORNECEDOR_FIELDS, NATUREZA_FIELDS, CENTRO_FIELDS } = require('./domain/cadastros');

const AuditTrail = require('./application/AuditTrail');
const AuditService = require('./application/AuditService');
const AuthService = require('./application/AuthService');
const AdminBootstrap = require('./application/AdminBootstrap');
const CadastroService = require('./application/CadastroService');
const TituloService = require('./application/TituloService');
const RelatorioService = require('./application/RelatorioService');
const DashboardService = require('./application/DashboardService');
const UsuarioService = require('./application/UsuarioService');
const ExportService = require('./application/ExportService');
const BackupService = require('./application/BackupService');
const CnpjLookupService = require('./application/CnpjLookupService');
const ProfilePhotoService = require('./application/ProfilePhotoService');
const SystemService = require('./application/SystemService');
const CsvImportService = require('./application/import/CsvImportService');
const FornecedorImporter = require('./application/import/FornecedorImporter');
const NaturezaImporter = require('./application/import/NaturezaImporter');
const CentroImporter = require('./application/import/CentroImporter');
const TituloImporter = require('./application/import/TituloImporter');

const Router = require('./presentation/http/Router');
const HttpServer = require('./presentation/http/HttpServer');
const StaticFileHandler = require('./presentation/http/StaticFileHandler');
const AuthController = require('./presentation/http/controllers/AuthController');
const CadastroController = require('./presentation/http/controllers/CadastroController');
const TituloController = require('./presentation/http/controllers/TituloController');
const RelatorioController = require('./presentation/http/controllers/RelatorioController');
const ExportController = require('./presentation/http/controllers/ExportController');
const ImportController = require('./presentation/http/controllers/ImportController');
const UsuarioController = require('./presentation/http/controllers/UsuarioController');
const DashboardController = require('./presentation/http/controllers/DashboardController');
const AuditController = require('./presentation/http/controllers/AuditController');
const SystemController = require('./presentation/http/controllers/SystemController');
const CnpjController = require('./presentation/http/controllers/CnpjController');
const ProfileController = require('./presentation/http/controllers/ProfileController');

const DEFAULT_PUBLIC_DIR = path.join(__dirname, '..', 'public');

/**
 * @param {object} options
 * @param {string} options.dbFile caminho do SQLite ou ':memory:'
 * @param {string} [options.publicDir]
 * @param {Pick<Console,'error'>} [options.logger]
 * @param {{fetchCnpj(cnpj:string): Promise<object>}} [options.cnpjGateway] consulta de CNPJ (trocável em testes)
 * @param {() => string} [options.clock] data de hoje (ISO) usada pelo dashboard (trocável em testes)
 * @param {{status(): object, check(): Promise<object>, installNow(): void}} [options.updater] atualizador (o Electron injeta o real)
 * @param {string} [options.version] versão exibida (padrão: package.json)
 */
function buildApplication({
  dbFile, publicDir = DEFAULT_PUBLIC_DIR, logger = console, cnpjGateway = new ReceitaWsGateway(), clock,
  updater = new NoUpdater(), version = require('../package.json').version,
}) {
  const db = new SqliteDatabase(dbFile);

  const fornecedores = new FornecedorRepository(db);
  const naturezas = new NaturezaRepository(db);
  const centros = new CentroRepository(db);
  const usuarios = new UsuarioRepository(db);
  const titulos = new TituloRepository(db);
  const auditRepository = new AuditRepository(db);

  const audit = new AuditTrail({ repository: auditRepository });
  const hasher = new PasswordHasher();
  const authService = new AuthService({ usuarios, hasher, sessions: new SessionStore(), throttle: new LoginThrottle(), audit });
  const adminBootstrap = new AdminBootstrap({ usuarios, hasher, audit });

  const tituloValidator = new TituloValidator({ fornecedores, naturezas, centros });
  const baixaValidator = new BaixaValidator();
  const tituloService = new TituloService({ titulos, tituloValidator, baixaValidator, policy: new TituloPolicy(), audit });
  const relatorioService = new RelatorioService({ titulos, fornecedores, naturezas, centros });
  const csvWriter = new CsvWriter();
  const exportService = new ExportService({ csvWriter, titulos, fornecedores, naturezas, centros, auditRepository });

  const importService = new CsvImportService({
    importers: Object.fromEntries([
      new FornecedorImporter({ repository: fornecedores }),
      new NaturezaImporter({ repository: naturezas }),
      new CentroImporter({ repository: centros }),
      new TituloImporter({ titulos, fornecedores, naturezas, centros, tituloValidator, baixaValidator }),
    ].map((importer) => [importer.entity, importer])),
    parser: new CsvParser(),
    csvWriter,
    transaction: (work) => db.transaction(work),
    audit,
  });

  const cadastro = (resource, entity, repository, fields, isInUse) => new CadastroController(
    resource,
    new CadastroService({ entity, repository, sanitizer: new FieldSanitizer(fields), isInUse, audit }),
  );
  const controllers = [
    new AuthController(authService),
    cadastro('fornecedores', 'fornecedor', fornecedores, FORNECEDOR_FIELDS, (id) => titulos.countByFornecedor(id) > 0),
    cadastro('naturezas', 'natureza', naturezas, NATUREZA_FIELDS, (id) => titulos.countByNatureza(id) > 0),
    cadastro('centros', 'centro', centros, CENTRO_FIELDS, (id) => titulos.countByCentro(id) > 0),
    new TituloController(tituloService),
    new RelatorioController(relatorioService, exportService),
    new ExportController(exportService),
    new ImportController(importService),
    new CnpjController(new CnpjLookupService({ gateway: cnpjGateway })),
    new ProfileController(new ProfilePhotoService({ usuarios, validator: new ProfilePhotoValidator(), audit })),
    new DashboardController(new DashboardService({ dashboard: new DashboardRepository(db), titulos, ...(clock && { clock }) })),
    new AuditController(new AuditService({ repository: auditRepository })),
    new SystemController(new SystemService({ version, updater, audit })),
    new UsuarioController(new UsuarioService({ usuarios, hasher, audit }), new BackupService({ db, audit })),
  ];

  const router = new Router();
  controllers.forEach((controller) => controller.register(router));
  const httpServer = new HttpServer({ router, authService, staticHandler: new StaticFileHandler(publicDir), logger });

  return {
    db, httpServer, adminBootstrap, hasher,
    repositories: { fornecedores, naturezas, centros, usuarios, titulos },
  };
}

module.exports = { buildApplication };
