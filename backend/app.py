import os
from flask import Flask, send_from_directory
from config import Config
from extensions import db, jwt, cors
from routes.auth import auth_bp
from routes.repairs import repairs_bp
from routes.admin import admin_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    jwt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": app.config["FRONTEND_ORIGIN"]}})

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(repairs_bp, url_prefix="/api/repairs")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")

    @app.route("/api/health")
    def health():
        return {"status": "ok"}

    @app.route("/uploads/<path:filename>")
    def uploaded_file(filename):
        return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

    return app


app = create_app()

if __name__ == "__main__":
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
    app.run(debug=True, port=5000)
