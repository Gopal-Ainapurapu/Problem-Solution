export function notFound(req, res) {
  console.log('404:', req.method, req.originalUrl);

  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
}
export function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    message: status === 500 ? 'Something went wrong' : err.message,
  });
}