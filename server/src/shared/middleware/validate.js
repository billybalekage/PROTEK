const ValidationError = require('../errors/validation.error');

const ROOT_SEGMENTS = ['body', 'query', 'params'];

// Traduction des messages génériques de Zod (ceux sans message personnalisé).
const translateIssue = (issue) => {
  switch (issue.code) {
    case 'invalid_type':
      return 'Champ requis ou de type incorrect.';
    case 'unrecognized_keys':
      return `Champ(s) non autorisé(s) : ${(issue.keys || []).join(', ')}.`;
    case 'invalid_value':
    case 'invalid_enum_value':
      return 'Valeur non autorisée.';
    default:
      return issue.message;
  }
};

const validate = (schema) => async (req, _res, next) => {
  try {
    const result = await schema.safeParseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.slice(ROOT_SEGMENTS.includes(issue.path[0]) ? 1 : 0).join('.') || null,
        message: translateIssue(issue),
      }));
      return next(new ValidationError(details));
    }

    // req.query est en lecture seule dans Express 5 : on expose tout via req.validated.
    req.validated = result.data;
    if (result.data.body) req.body = result.data.body;
    return next();
  } catch (err) {
    return next(err);
  }
};

module.exports = validate;